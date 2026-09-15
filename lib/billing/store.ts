import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

import { getDefaultBillingPolicy } from './policies';
import { assertTransition } from './state-machine';
import type {
  BillingAccount,
  BillingAuditEntry,
  BillingStatus,
  InvoiceRecord,
  PaymentEventRecord,
  SettlementStatus,
} from './types';

type StoreFile = {
  accounts: BillingAccount[];
  events: PaymentEventRecord[];
  audits: BillingAuditEntry[];
  invoices: InvoiceRecord[];
};

function dataPath(): string {
  return (
    process.env.DEALERHUB_BILLING_STORE ||
    path.join(process.cwd(), '.data', 'billing-store.json')
  );
}

function empty(): StoreFile {
  return { accounts: [], events: [], audits: [], invoices: [] };
}

function read(): StoreFile {
  try {
    const p = dataPath();
    if (!fs.existsSync(p)) return empty();
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as StoreFile;
    return {
      accounts: raw.accounts || [],
      events: raw.events || [],
      audits: raw.audits || [],
      invoices: raw.invoices || [],
    };
  } catch {
    return empty();
  }
}

function writeStore(store: StoreFile): void {
  const p = dataPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(store, null, 2), 'utf8');
}

function nowIso(): string {
  return new Date().toISOString();
}

export function resetBillingStoreForTests(): void {
  writeStore(empty());
}

export function ensureBillingAccount(tenantId: number, email?: string | null): BillingAccount {
  const store = read();
  let acct = store.accounts.find((a) => a.tenantId === tenantId);
  if (!acct) {
    const ts = nowIso();
    acct = {
      billingAccountId: randomUUID(),
      tenantId,
      provider: process.env.STRIPE_SECRET_KEY ? 'stripe' : 'mock',
      providerCustomerId: null,
      billingEmail: email || null,
      status: 'TRIAL',
      manualHoldYn: 'N',
      graceUntil: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      providerSubscriptionId: null,
      providerPriceId: process.env.STRIPE_PRICE_ID || null,
      createdAt: ts,
      updatedAt: ts,
    };
    store.accounts.push(acct);
    writeStore(store);
  }
  return acct;
}

export function getBillingAccountByTenant(tenantId: number): BillingAccount | null {
  return read().accounts.find((a) => a.tenantId === tenantId) || null;
}

export function getBillingAccountByCustomerId(
  customerId: string
): BillingAccount | null {
  return (
    read().accounts.find((a) => a.providerCustomerId === customerId) || null
  );
}

export function listBillingAccounts(): BillingAccount[] {
  return [...read().accounts].sort((a, b) => a.tenantId - b.tenantId);
}

export function appendAudit(input: Omit<BillingAuditEntry, 'auditId' | 'createdAt'>): void {
  const store = read();
  store.audits.push({
    ...input,
    auditId: randomUUID(),
    createdAt: nowIso(),
  });
  writeStore(store);
}

export function transitionBillingStatus(input: {
  tenantId: number;
  to: BillingStatus;
  actor: string;
  detail: string;
  providerEventId?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  graceUntil?: string | null;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
}): BillingAccount {
  const store = read();
  let acct = store.accounts.find((a) => a.tenantId === input.tenantId);
  if (!acct) {
    acct = ensureBillingAccount(input.tenantId);
    // refresh store reference
    const again = read();
    acct = again.accounts.find((a) => a.tenantId === input.tenantId)!;
    store.accounts = again.accounts;
    store.events = again.events;
    store.audits = again.audits;
    store.invoices = again.invoices;
  }

  assertTransition(acct.status, input.to);
  const from = acct.status;
  acct.status = input.to;
  acct.updatedAt = nowIso();
  if (input.periodStart !== undefined) acct.currentPeriodStart = input.periodStart;
  if (input.periodEnd !== undefined) acct.currentPeriodEnd = input.periodEnd;
  if (input.graceUntil !== undefined) acct.graceUntil = input.graceUntil;
  if (input.providerCustomerId) acct.providerCustomerId = input.providerCustomerId;
  if (input.providerSubscriptionId)
    acct.providerSubscriptionId = input.providerSubscriptionId;
  if (input.to === 'MANUAL_HOLD') acct.manualHoldYn = 'Y';
  if (from === 'MANUAL_HOLD' && input.to !== 'MANUAL_HOLD') acct.manualHoldYn = 'N';

  store.audits.push({
    auditId: randomUUID(),
    tenantId: acct.tenantId,
    billingAccountId: acct.billingAccountId,
    actor: input.actor,
    action: 'STATUS_TRANSITION',
    fromStatus: from,
    toStatus: input.to,
    detail: input.detail,
    providerEventId: input.providerEventId || null,
    createdAt: nowIso(),
  });
  writeStore(store);
  return acct;
}

export function findPaymentEvent(
  provider: string,
  providerEventId: string
): PaymentEventRecord | null {
  return (
    read().events.find(
      (e) => e.provider === provider && e.providerEventId === providerEventId
    ) || null
  );
}

export function recordPaymentEvent(input: {
  provider: string;
  providerEventId: string;
  eventType: string;
  tenantId: number | null;
  billingAccountId: string | null;
  paymentMethodType: string | null;
  settlementStatus: SettlementStatus;
  rawSanitizedSummary: string;
}): { event: PaymentEventRecord; duplicate: boolean } {
  const existing = findPaymentEvent(input.provider, input.providerEventId);
  if (existing) {
    return { event: existing, duplicate: true };
  }
  const store = read();
  const event: PaymentEventRecord = {
    provider: input.provider,
    providerEventId: input.providerEventId,
    eventType: input.eventType,
    tenantId: input.tenantId,
    billingAccountId: input.billingAccountId,
    paymentMethodType: input.paymentMethodType,
    settlementStatus: input.settlementStatus,
    rawSanitizedSummary: input.rawSanitizedSummary,
    processedYn: 'N',
    processingResult: null,
    receivedAt: nowIso(),
    processedAt: null,
  };
  store.events.push(event);
  writeStore(store);
  return { event, duplicate: false };
}

export function markPaymentEventProcessed(
  provider: string,
  providerEventId: string,
  result: string
): void {
  const store = read();
  const event = store.events.find(
    (e) => e.provider === provider && e.providerEventId === providerEventId
  );
  if (!event) return;
  event.processedYn = 'Y';
  event.processingResult = result;
  event.processedAt = nowIso();
  writeStore(store);
}

/** Idempotent late fee: at most max per cycleKey; never compounds on retries. */
export function applyLateFeeIfAllowed(input: {
  tenantId: number;
  billingAccountId: string;
  cycleKey: string;
  amountCents?: number;
}): { applied: boolean; invoice: InvoiceRecord | null; reason: string } {
  const policy = getDefaultBillingPolicy();
  if (!policy.lateFeeEnabled) {
    return { applied: false, invoice: null, reason: 'LATE_FEE_DISABLED' };
  }
  const store = read();
  const existing = store.invoices.filter(
    (i) =>
      i.tenantId === input.tenantId &&
      i.cycleKey === input.cycleKey &&
      i.lateFeeAppliedYn === 'Y'
  );
  if (existing.length >= policy.maxLateFeesPerCycle) {
    return { applied: false, invoice: existing[0] || null, reason: 'MAX_LATE_FEES_REACHED' };
  }
  const amount = input.amountCents ?? policy.lateFeeAmountCents;
  const invoice: InvoiceRecord = {
    invoiceId: randomUUID(),
    tenantId: input.tenantId,
    billingAccountId: input.billingAccountId,
    providerInvoiceId: null,
    status: 'late_fee',
    amountDueCents: amount,
    amountPaidCents: 0,
    currency: 'usd',
    periodStart: null,
    periodEnd: null,
    lateFeeAppliedYn: 'Y',
    lateFeeCents: amount,
    cycleKey: input.cycleKey,
  };
  store.invoices.push(invoice);
  writeStore(store);
  return { applied: true, invoice, reason: 'APPLIED' };
}

export function listAudits(tenantId?: number, limit = 50): BillingAuditEntry[] {
  return read()
    .audits.filter((a) => (tenantId == null ? true : a.tenantId === tenantId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function billingSummaryCards(): {
  byStatus: Record<string, number>;
  totalAccounts: number;
  note: string;
} {
  const accounts = listBillingAccounts();
  const byStatus: Record<string, number> = {};
  for (const a of accounts) {
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
  }
  return {
    byStatus,
    totalAccounts: accounts.length,
    note: 'Counts from billing accounts only — MRR not fabricated',
  };
}

export function enterGraceIfNeeded(tenantId: number, actor: string): BillingAccount {
  const acct = getBillingAccountByTenant(tenantId) || ensureBillingAccount(tenantId);
  if (acct.status !== 'PAST_DUE') return acct;
  const policy = getDefaultBillingPolicy();
  const until = new Date(Date.now() + policy.graceDays * 86400000).toISOString();
  return transitionBillingStatus({
    tenantId,
    to: 'GRACE',
    actor,
    detail: `Entered grace for ${policy.graceDays} day(s)`,
    graceUntil: until,
  });
}

export function suspendIfGraceExpired(tenantId: number, actor: string, now = new Date()): BillingAccount {
  const acct = getBillingAccountByTenant(tenantId) || ensureBillingAccount(tenantId);
  if (acct.status !== 'GRACE') return acct;
  const policy = getDefaultBillingPolicy();
  if (!policy.suspendAfterGrace) return acct;
  if (acct.graceUntil && new Date(acct.graceUntil).getTime() > now.getTime()) {
    return acct;
  }
  return transitionBillingStatus({
    tenantId,
    to: 'SUSPENDED',
    actor,
    detail: 'Grace expired — suspended',
  });
}
