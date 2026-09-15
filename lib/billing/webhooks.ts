import { recordIncidentOccurrence } from '@/lib/incidents/store';

import { getBillingProvider } from './provider-factory';
import { sanitizeBillingText } from './sanitize';
import {
  enterGraceIfNeeded,
  findPaymentEvent,
  getBillingAccountByCustomerId,
  getBillingAccountByTenant,
  markPaymentEventProcessed,
  recordPaymentEvent,
  suspendIfGraceExpired,
  transitionBillingStatus,
} from './store';
import type { SettlementStatus } from './types';

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function extractTenantId(eventData: Record<string, unknown>): number | null {
  const obj = asObject(eventData.object);
  // Prefer server-side customer→tenant mapping over event metadata (anti-forgery).
  const customer = String(obj.customer || '');
  if (customer) {
    const acct = getBillingAccountByCustomerId(customer);
    if (acct) return acct.tenantId;
  }
  const meta = asObject(obj.metadata);
  const fromMeta = Number(meta.tenant_id || meta.tenantId);
  if (Number.isInteger(fromMeta) && fromMeta > 0) return fromMeta;
  return null;
}

function settlementFromEvent(type: string, obj: Record<string, unknown>): SettlementStatus {
  if (type.includes('payment_intent.processing') || obj.status === 'processing') {
    return 'pending';
  }
  if (type.includes('requires_action') || obj.status === 'requires_action') {
    return 'requires_action';
  }
  if (type.includes('failed') || obj.status === 'failed' || obj.status === 'open') {
    // open invoice may still be unpaid — treat carefully in handlers
    return 'failed';
  }
  if (
    type.includes('paid') ||
    type.includes('succeeded') ||
    obj.status === 'paid' ||
    obj.status === 'succeeded' ||
    obj.status === 'active'
  ) {
    return 'settled';
  }
  return 'n/a';
}

function notifyHook(message: string): void {
  // Placeholder notification hook — no external send in V1.
  console.info('[billing:notify]', sanitizeBillingText(message));
}

/**
 * Process provider webhook. Browser success pages must NEVER call this path
 * to activate tenants — only verified provider events.
 */
export async function processBillingWebhook(input: {
  rawBody: string | Buffer;
  signature: string | null;
  provider?: string;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const provider = getBillingProvider();
  const verified = await provider.verifyWebhook(input.rawBody, input.signature);
  if (!verified.ok) {
    try {
      recordIncidentOccurrence({
        error: 'STRIPE_WEBHOOK_SIGNATURE_FAILURE',
        requestPath: '/api/billing/webhook',
      });
    } catch {
      /* ignore */
    }
    return { status: 400, body: { ok: false, error: 'invalid_signature' } };
  }

  const event = verified.event;
  const dataObj = asObject(asObject(event.data).object);
  const tenantId = extractTenantId(asObject(event.data));
  const settlement = settlementFromEvent(event.type, dataObj);
  const acct = tenantId ? getBillingAccountByTenant(tenantId) : null;

  const recorded = recordPaymentEvent({
    provider: provider.name,
    providerEventId: event.id,
    eventType: event.type,
    tenantId,
    billingAccountId: acct?.billingAccountId || null,
    paymentMethodType: String(dataObj.payment_method_types || dataObj.type || '') || null,
    settlementStatus: settlement,
    rawSanitizedSummary: sanitizeBillingText(
      `${event.type} tenant=${tenantId ?? 'n/a'} status=${String(dataObj.status || '')}`
    ),
  });

  if (recorded.duplicate) {
    try {
      recordIncidentOccurrence({
        error: 'DUPLICATE_PAYMENT_EVENT',
        requestPath: '/api/billing/webhook',
      });
    } catch {
      /* ignore */
    }
    return {
      status: 200,
      body: { ok: true, duplicate: true, eventId: event.id },
    };
  }

  try {
    await applyEventSideEffects({
      type: event.type,
      tenantId,
      settlement,
      dataObj,
      eventId: event.id,
    });
    markPaymentEventProcessed(provider.name, event.id, 'OK');
    return { status: 200, body: { ok: true, eventId: event.id } };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('BILLING_STATE_MISMATCH')) {
      try {
        recordIncidentOccurrence({
          error: 'BILLING_STATE_MISMATCH ' + msg,
          requestPath: '/api/billing/webhook',
        });
      } catch {
        /* ignore */
      }
    }
    markPaymentEventProcessed(provider.name, event.id, 'ERROR');
    return {
      status: 200,
      body: { ok: false, stored: true, error: 'processing_error' },
    };
  }
}

async function applyEventSideEffects(input: {
  type: string;
  tenantId: number | null;
  settlement: SettlementStatus;
  dataObj: Record<string, unknown>;
  eventId: string;
}): Promise<void> {
  const { type, tenantId, settlement, dataObj, eventId } = input;
  if (!tenantId) return;

  const periodStart = dataObj.current_period_start
    ? new Date(Number(dataObj.current_period_start) * 1000).toISOString()
    : dataObj.period_start
      ? String(dataObj.period_start)
      : null;
  const periodEnd = dataObj.current_period_end
    ? new Date(Number(dataObj.current_period_end) * 1000).toISOString()
    : dataObj.period_end
      ? String(dataObj.period_end)
      : null;

  const customerId = dataObj.customer ? String(dataObj.customer) : null;
  const subscriptionId = dataObj.subscription
    ? String(dataObj.subscription)
    : dataObj.id && String(type).startsWith('customer.subscription')
      ? String(dataObj.id)
      : null;

  // ACH pending — do NOT unsuspend
  if (settlement === 'pending') {
    notifyHook(`ACH pending for tenant ${tenantId}; no unsuspend`);
    return;
  }

  if (
    type === 'invoice.payment_succeeded' ||
    type === 'invoice.paid' ||
    type === 'checkout.session.completed'
  ) {
    if (settlement === 'settled' || type === 'checkout.session.completed') {
      // checkout.session.completed may still be unpaid for async methods — check payment_status
      if (type === 'checkout.session.completed') {
        const ps = String(dataObj.payment_status || '');
        if (ps && ps !== 'paid') {
          notifyHook(`Checkout completed but payment_status=${ps}; no activate`);
          return;
        }
      }
      try {
        transitionBillingStatus({
          tenantId,
          to: 'ACTIVE',
          actor: 'stripe-webhook',
          detail: `Reactivated on ${type}`,
          providerEventId: eventId,
          periodStart,
          periodEnd,
          providerCustomerId: customerId,
          providerSubscriptionId: subscriptionId,
          graceUntil: null,
        });
        notifyHook(`Tenant ${tenantId} ACTIVE after settled payment`);
      } catch (error) {
        recordIncidentOccurrence({
          error: 'ACCOUNT_REACTIVATION_FAILURE ' + String(error),
          requestPath: '/api/billing/webhook',
        });
        throw error;
      }
    }
    return;
  }

  if (type === 'invoice.payment_failed') {
    transitionBillingStatus({
      tenantId,
      to: 'PAST_DUE',
      actor: 'stripe-webhook',
      detail: 'Invoice payment failed',
      providerEventId: eventId,
    });
    enterGraceIfNeeded(tenantId, 'stripe-webhook');
    notifyHook(`Tenant ${tenantId} PAST_DUE/GRACE after payment failure`);
    return;
  }

  if (type === 'invoice.payment_action_required' || type === 'payment_intent.requires_action') {
    notifyHook(`Payment action required for tenant ${tenantId}`);
    return;
  }

  if (type === 'customer.subscription.deleted') {
    transitionBillingStatus({
      tenantId,
      to: 'CANCELED',
      actor: 'stripe-webhook',
      detail: 'Subscription deleted',
      providerEventId: eventId,
    });
    return;
  }

  if (type === 'customer.subscription.updated' || type === 'customer.subscription.created') {
    const status = String(dataObj.status || '');
    if (status === 'active') {
      transitionBillingStatus({
        tenantId,
        to: 'ACTIVE',
        actor: 'stripe-webhook',
        detail: `Subscription ${status}`,
        providerEventId: eventId,
        periodStart,
        periodEnd,
        providerCustomerId: customerId,
        providerSubscriptionId: subscriptionId,
      });
    } else if (status === 'past_due') {
      transitionBillingStatus({
        tenantId,
        to: 'PAST_DUE',
        actor: 'stripe-webhook',
        detail: 'Subscription past_due',
        providerEventId: eventId,
      });
    } else if (status === 'canceled') {
      transitionBillingStatus({
        tenantId,
        to: 'CANCELED',
        actor: 'stripe-webhook',
        detail: 'Subscription canceled',
        providerEventId: eventId,
      });
    }
  }
}

export function forceSuspendExpiredGrace(tenantId: number): void {
  suspendIfGraceExpired(tenantId, 'billing-scheduler');
}

export function getExistingEvent(provider: string, id: string) {
  return findPaymentEvent(provider, id);
}
