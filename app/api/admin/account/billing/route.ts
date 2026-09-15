import { NextResponse } from 'next/server';

import {
  isPlatformAdminSession,
  requireAdminSession,
} from '@/lib/admin-auth';
import { billingProviderMode } from '@/lib/billing/provider-factory';
import {
  ensureBillingAccount,
  getBillingAccountByTenant,
  listAudits,
} from '@/lib/billing/store';
import { isPaymentRequiredStatus } from '@/lib/billing/state-machine';
import { resolveDealerTenantId } from '@/lib/billing/tenant-map';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await requireAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isPlatformAdminSession(session)) {
    return NextResponse.json({
      ok: true,
      role: 'platform_admin',
      message: 'Use /admin/billing for platform operations',
    });
  }

  const tenantId = resolveDealerTenantId(session);
  if (!tenantId) {
    return NextResponse.json(
      { error: 'Dealer tenant mapping not configured' },
      { status: 400 }
    );
  }

  const account = getBillingAccountByTenant(tenantId) || ensureBillingAccount(tenantId, session.email);
  return NextResponse.json({
    ok: true,
    providerMode: billingProviderMode(),
    paymentRequired: isPaymentRequiredStatus(account.status),
    account: {
      tenantId: account.tenantId,
      status: account.status,
      currentPeriodEnd: account.currentPeriodEnd,
      currentPeriodStart: account.currentPeriodStart,
      graceUntil: account.graceUntil,
      hasCustomer: Boolean(account.providerCustomerId),
      // never return raw provider secrets; customer id only for support opacity — omit full id from UI payload
      customerLinked: Boolean(account.providerCustomerId),
    },
    history: listAudits(tenantId, 20).map((a) => ({
      action: a.action,
      fromStatus: a.fromStatus,
      toStatus: a.toStatus,
      detail: a.detail,
      createdAt: a.createdAt,
    })),
  });
}
