import type { AdminSession } from '@/lib/admin-auth';
import { isPlatformAdminSession } from '@/lib/admin-auth';

import { isAdminAccessBlocked, isPaymentRequiredStatus } from './state-machine';
import { ensureBillingAccount, getBillingAccountByTenant } from './store';
import { resolveDealerTenantId } from './tenant-map';
import type { BillingStatus } from './types';

const SUSPENDED_PAGE_ALLOW = [
  '/admin/login',
  '/admin/account/billing',
  '/admin/account/support',
];

const SUSPENDED_API_ALLOW = [
  '/api/admin/login',
  '/api/admin/logout',
  '/api/admin/account/billing',
  '/api/billing/webhook',
];

export function isSuspendedAllowlistedPath(pathname: string): boolean {
  if (SUSPENDED_PAGE_ALLOW.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return true;
  }
  if (SUSPENDED_API_ALLOW.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return true;
  }
  return false;
}

export function getSessionBillingStatus(
  session: AdminSession | null | undefined
): {
  tenantId: number | null;
  status: BillingStatus | null;
  paymentRequired: boolean;
  blocked: boolean;
} {
  if (!session) {
    return { tenantId: null, status: null, paymentRequired: false, blocked: false };
  }
  if (isPlatformAdminSession(session)) {
    return { tenantId: null, status: null, paymentRequired: false, blocked: false };
  }
  const tenantId = resolveDealerTenantId(session);
  if (!tenantId) {
    return { tenantId: null, status: null, paymentRequired: false, blocked: false };
  }
  const acct = getBillingAccountByTenant(tenantId) || ensureBillingAccount(tenantId);
  return {
    tenantId,
    status: acct.status,
    paymentRequired: isPaymentRequiredStatus(acct.status),
    blocked: isAdminAccessBlocked(acct.status),
  };
}

/**
 * AUTH → TENANT → BILLING STATE → allow or payment-required.
 * Platform Admin never blocked by dealer delinquency.
 */
export function evaluateDealerBillingGate(input: {
  session: AdminSession | null;
  pathname: string;
  isApi: boolean;
}): {
  allow: boolean;
  statusCode: number;
  reason: string;
  redirectTo?: string;
  tenantId: number | null;
  status: BillingStatus | null;
} {
  const { session, pathname, isApi } = input;
  if (!session) {
    return {
      allow: false,
      statusCode: 401,
      reason: 'unauthenticated',
      tenantId: null,
      status: null,
    };
  }
  if (isPlatformAdminSession(session)) {
    return {
      allow: true,
      statusCode: 200,
      reason: 'platform_admin',
      tenantId: null,
      status: null,
    };
  }

  const billing = getSessionBillingStatus(session);
  if (!billing.blocked) {
    return {
      allow: true,
      statusCode: 200,
      reason: 'ok',
      tenantId: billing.tenantId,
      status: billing.status,
    };
  }

  if (isSuspendedAllowlistedPath(pathname)) {
    return {
      allow: true,
      statusCode: 200,
      reason: 'allowlisted_while_suspended',
      tenantId: billing.tenantId,
      status: billing.status,
    };
  }

  if (isApi) {
    return {
      allow: false,
      statusCode: 402,
      reason: 'payment_required',
      tenantId: billing.tenantId,
      status: billing.status,
    };
  }

  return {
    allow: false,
    statusCode: 402,
    reason: 'payment_required',
    redirectTo: '/admin/account/billing',
    tenantId: billing.tenantId,
    status: billing.status,
  };
}
