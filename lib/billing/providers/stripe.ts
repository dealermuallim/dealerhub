import Stripe from 'stripe';

import type { BillingProvider, ProviderEvent } from './types';

export function createStripeBillingProvider(): BillingProvider {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_PROVIDER_UNAVAILABLE: STRIPE_SECRET_KEY missing');
  }
  const stripe = new Stripe(key);

  return {
    name: 'stripe',
    async createCustomer({ tenantId, email }) {
      const customer = await stripe.customers.create({
        email: email || undefined,
        metadata: { tenant_id: String(tenantId) },
      });
      return { customerId: customer.id };
    },
    async createCheckoutSession(input) {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: input.customerId || undefined,
        customer_email: input.customerId ? undefined : input.customerEmail || undefined,
        line_items: [{ price: input.priceId, quantity: 1 }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        payment_method_types: ['card', 'us_bank_account'],
        metadata: { tenant_id: String(input.tenantId) },
        subscription_data: {
          metadata: { tenant_id: String(input.tenantId) },
        },
      });
      if (!session.url) {
        throw new Error('STRIPE_PROVIDER_UNAVAILABLE: checkout url missing');
      }
      return { id: session.id, url: session.url };
    },
    async createPortalSession(input) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: input.customerId,
        return_url: input.returnUrl,
      });
      return { url: portal.url };
    },
    async verifyWebhook(rawBody, signature) {
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!secret) {
        return { ok: false, reason: 'STRIPE_WEBHOOK_SIGNATURE_FAILURE' };
      }
      if (!signature) {
        return { ok: false, reason: 'STRIPE_WEBHOOK_SIGNATURE_FAILURE' };
      }
      try {
        const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
        return {
          ok: true,
          event: {
            id: event.id,
            type: event.type,
            created: event.created,
            data: event.data as unknown as Record<string, unknown>,
          } satisfies ProviderEvent,
        };
      } catch {
        return { ok: false, reason: 'STRIPE_WEBHOOK_SIGNATURE_FAILURE' };
      }
    },
  };
}
