import { NextResponse } from 'next/server';

import {
  isPlatformAdminSession,
  requireAdminSession,
} from '@/lib/admin-auth';
import { getBillingProvider } from '@/lib/billing/provider-factory';
import { ensureBillingAccount, transitionBillingStatus } from '@/lib/billing/store';
import { resolveDealerTenantId } from '@/lib/billing/tenant-map';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function allowlistedUrl(raw: string | null, fallback: string): string {
  const base = process.env.BILLING_APP_ORIGIN || 'http://localhost:3000';
  if (!raw) return fallback;
  try {
    const u = new URL(raw);
    const allowed = new URL(base);
    if (u.origin !== allowed.origin) return fallback;
    return u.toString();
  } catch {
    return fallback;
  }
}

export async function POST(request: Request) {
  const session = await requireAdminSession(request);
  if (!session || isPlatformAdminSession(session)) {
    // Platform uses operational tools; checkout is dealer recovery path
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const tenantId = isPlatformAdminSession(session)
    ? null
    : resolveDealerTenantId(session);
  if (!tenantId) {
    return NextResponse.json(
      { error: 'Unauthorized or tenant mapping missing' },
      { status: 403 }
    );
  }

  // Ignore any client-supplied tenant/customer/amount/price
  const body = (await request.json().catch(() => ({}))) as {
    successUrl?: string;
    cancelUrl?: string;
  };

  const priceId = process.env.STRIPE_PRICE_ID || 'price_mock_dealerhub';
  const origin = process.env.BILLING_APP_ORIGIN || 'http://localhost:3000';
  const successUrl = allowlistedUrl(
    body.successUrl || null,
    `${origin}/admin/account/billing?checkout=success`
  );
  const cancelUrl = allowlistedUrl(
    body.cancelUrl || null,
    `${origin}/admin/account/billing?checkout=cancel`
  );

  const account = ensureBillingAccount(tenantId, session.email);
  const provider = getBillingProvider();

  let customerId = account.providerCustomerId;
  if (!customerId) {
    const created = await provider.createCustomer({
      tenantId,
      email: session.email,
    });
    customerId = created.customerId;
    transitionBillingStatus({
      tenantId,
      to: account.status,
      actor: 'checkout',
      detail: 'Linked provider customer',
      providerCustomerId: customerId,
    });
  }

  const sessionOut = await provider.createCheckoutSession({
    tenantId,
    customerId,
    customerEmail: session.email,
    priceId,
    successUrl,
    cancelUrl,
  });

  return NextResponse.json({
    ok: true,
    id: sessionOut.id,
    url: sessionOut.url,
    note: 'Activation occurs only after verified provider webhook — not this redirect',
  });
}
