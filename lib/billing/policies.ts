import type { BillingPolicy } from './types';

export function getDefaultBillingPolicy(): BillingPolicy {
  return {
    policyCode: 'DEFAULT',
    graceDays: Number(process.env.BILLING_GRACE_DAYS || 3),
    lateFeeEnabled: String(process.env.BILLING_LATE_FEE_ENABLED || 'false') === 'true',
    lateFeeAmountCents: Number(process.env.BILLING_LATE_FEE_CENTS || 5000),
    maxLateFeesPerCycle: Number(process.env.BILLING_MAX_LATE_FEES_PER_CYCLE || 1),
    suspendAfterGrace: String(process.env.BILLING_SUSPEND_AFTER_GRACE || 'true') !== 'false',
    reminderEnabled: true,
  };
}
