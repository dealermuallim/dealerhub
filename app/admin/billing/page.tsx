import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import {
  ADMIN_SESSION_COOKIE,
  isPlatformAdminSession,
  parseAndVerifySessionToken,
} from '@/lib/admin-auth';
import { billingProviderMode } from '@/lib/billing/provider-factory';
import {
  billingSummaryCards,
  listBillingAccounts,
} from '@/lib/billing/store';
import PlatformBillingClient from './PlatformBillingClient';

export const dynamic = 'force-dynamic';

export default async function PlatformBillingPage() {
  const jar = await cookies();
  const session = await parseAndVerifySessionToken(
    jar.get(ADMIN_SESSION_COOKIE)?.value
  );
  if (!session) redirect('/admin/login');
  if (!isPlatformAdminSession(session)) {
    return (
      <main style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>
        <h1>Forbidden</h1>
        <p>Platform Admin only.</p>
        <Link href="/admin/account/billing">Dealer billing</Link>
      </main>
    );
  }

  return (
    <PlatformBillingClient
      providerMode={billingProviderMode()}
      summary={billingSummaryCards()}
      accounts={listBillingAccounts().map((a) => ({
        tenantId: a.tenantId,
        status: a.status,
        currentPeriodEnd: a.currentPeriodEnd,
        graceUntil: a.graceUntil,
        customerLinked: Boolean(a.providerCustomerId),
        updatedAt: a.updatedAt,
      }))}
    />
  );
}
