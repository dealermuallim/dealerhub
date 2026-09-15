import { NextResponse } from 'next/server';

import {
  isPlatformAdminSession,
  requireAdminSession,
} from '@/lib/admin-auth';
import { getBillingProvider } from '@/lib/billing/provider-factory';
import { getBillingAccountByTenant } from '@/lib/billing/store';
import { resolveDealerTenantId } from '@/lib/billing/tenant-map';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await requireAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (isPlatformAdminSession(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const tenantId = resolveDealerTenantId(session);
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant mapping missing' }, { status: 403 });
  }

  // Never trust browser customer id
  const account = getBillingAccountByTenant(tenantId);
  if (!account?.providerCustomerId) {
    return NextResponse.json(
      { error: 'No billing customer on file — start Checkout first' },
      { status: 400 }
    );
  }

  const origin = process.env.BILLING_APP_ORIGIN || 'http://localhost:3000';
  const returnUrl = `${origin}/admin/account/billing`;
  const provider = getBillingProvider();
  const portal = await provider.createPortalSession({
    customerId: account.providerCustomerId,
    returnUrl,
  });

  return NextResponse.json({ ok: true, url: portal.url });
}
