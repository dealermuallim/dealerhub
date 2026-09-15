import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import {
  ADMIN_SESSION_COOKIE,
  isPlatformAdminSession,
  parseAndVerifySessionToken,
} from '@/lib/admin-auth';
import {
  ensureBillingAccount,
  getBillingAccountByTenant,
  listAudits,
} from '@/lib/billing/store';
import { isAdminAccessBlocked, isPaymentRequiredStatus } from '@/lib/billing/state-machine';
import { resolveDealerTenantId } from '@/lib/billing/tenant-map';
import { billingProviderMode } from '@/lib/billing/provider-factory';
import DealerBillingClient from './DealerBillingClient';

export const dynamic = 'force-dynamic';

export default async function DealerBillingPage() {
  const jar = await cookies();
  const session = await parseAndVerifySessionToken(
    jar.get(ADMIN_SESSION_COOKIE)?.value
  );
  if (!session) redirect('/admin/login');
  if (isPlatformAdminSession(session)) {
    redirect('/admin/billing');
  }

  const tenantId = resolveDealerTenantId(session);
  if (!tenantId) {
    return (
      <main style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>
        <h1>Billing</h1>
        <p>Dealer tenant mapping is not configured (DEALER_ADMIN_TENANT_ID).</p>
        <Link href="/admin">Back</Link>
      </main>
    );
  }

  const account =
    getBillingAccountByTenant(tenantId) ||
    ensureBillingAccount(tenantId, session.email);
  const paymentRequired = isPaymentRequiredStatus(account.status);
  const suspended = isAdminAccessBlocked(account.status);

  return (
    <DealerBillingClient
      status={account.status}
      paymentRequired={paymentRequired}
      suspended={suspended}
      periodEnd={account.currentPeriodEnd}
      graceUntil={account.graceUntil}
      providerMode={billingProviderMode()}
      history={listAudits(tenantId, 20).map((a) => ({
        action: a.action,
        fromStatus: a.fromStatus,
        toStatus: a.toStatus,
        detail: a.detail,
        createdAt: a.createdAt,
      }))}
    />
  );
}
