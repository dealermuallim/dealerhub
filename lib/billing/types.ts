export type BillingStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'GRACE'
  | 'SUSPENDED'
  | 'CANCELED'
  | 'MANUAL_HOLD';

export type SettlementStatus =
  | 'pending'
  | 'settled'
  | 'failed'
  | 'requires_action'
  | 'n/a';

export type BillingAccount = {
  billingAccountId: string;
  tenantId: number;
  provider: 'stripe' | 'mock' | 'paypal_future';
  providerCustomerId: string | null;
  billingEmail: string | null;
  status: BillingStatus;
  manualHoldYn: 'Y' | 'N';
  graceUntil: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  providerSubscriptionId: string | null;
  providerPriceId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentEventRecord = {
  provider: string;
  providerEventId: string;
  eventType: string;
  tenantId: number | null;
  billingAccountId: string | null;
  paymentMethodType: string | null;
  settlementStatus: SettlementStatus;
  rawSanitizedSummary: string;
  processedYn: 'Y' | 'N';
  processingResult: string | null;
  receivedAt: string;
  processedAt: string | null;
};

export type BillingAuditEntry = {
  auditId: string;
  tenantId: number | null;
  billingAccountId: string | null;
  actor: string;
  action: string;
  fromStatus: BillingStatus | null;
  toStatus: BillingStatus | null;
  detail: string;
  providerEventId: string | null;
  createdAt: string;
};

export type BillingPolicy = {
  policyCode: string;
  graceDays: number;
  lateFeeEnabled: boolean;
  lateFeeAmountCents: number;
  maxLateFeesPerCycle: number;
  suspendAfterGrace: boolean;
  reminderEnabled: boolean;
};

export type InvoiceRecord = {
  invoiceId: string;
  tenantId: number;
  billingAccountId: string;
  providerInvoiceId: string | null;
  status: string;
  amountDueCents: number;
  amountPaidCents: number;
  currency: string;
  periodStart: string | null;
  periodEnd: string | null;
  lateFeeAppliedYn: 'Y' | 'N';
  lateFeeCents: number;
  cycleKey: string;
};
