import type { BillingStatus } from './types';

const ALLOWED: Record<BillingStatus, BillingStatus[]> = {
  TRIAL: ['ACTIVE', 'CANCELED', 'MANUAL_HOLD', 'SUSPENDED'],
  ACTIVE: ['PAST_DUE', 'CANCELED', 'MANUAL_HOLD', 'SUSPENDED'],
  PAST_DUE: ['GRACE', 'ACTIVE', 'SUSPENDED', 'CANCELED', 'MANUAL_HOLD'],
  GRACE: ['SUSPENDED', 'ACTIVE', 'CANCELED', 'MANUAL_HOLD', 'PAST_DUE'],
  SUSPENDED: ['ACTIVE', 'CANCELED', 'MANUAL_HOLD'],
  CANCELED: ['ACTIVE', 'TRIAL', 'MANUAL_HOLD'],
  MANUAL_HOLD: ['ACTIVE', 'SUSPENDED', 'CANCELED', 'TRIAL'],
};

export function canTransition(
  from: BillingStatus,
  to: BillingStatus
): boolean {
  if (from === to) return true;
  return (ALLOWED[from] || []).includes(to);
}

export function assertTransition(from: BillingStatus, to: BillingStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`BILLING_STATE_MISMATCH: ${from} -> ${to}`);
  }
}

/** Admin business access — not public site. */
export function isAdminAccessBlocked(status: BillingStatus): boolean {
  return status === 'SUSPENDED' || status === 'MANUAL_HOLD';
}

export function isPaymentRequiredStatus(status: BillingStatus): boolean {
  return (
    status === 'SUSPENDED' ||
    status === 'PAST_DUE' ||
    status === 'GRACE' ||
    status === 'MANUAL_HOLD'
  );
}
