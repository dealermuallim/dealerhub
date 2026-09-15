import { NextResponse } from 'next/server';

import { requirePlatformAdminSession } from '@/lib/admin-auth';
import { billingProviderMode } from '@/lib/billing/provider-factory';
import {
  billingSummaryCards,
  listBillingAccounts,
  transitionBillingStatus,
} from '@/lib/billing/store';
import type { BillingStatus } from '@/lib/billing/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await requirePlatformAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    providerMode: billingProviderMode(),
    summary: billingSummaryCards(),
    accounts: listBillingAccounts().map((a) => ({
      tenantId: a.tenantId,
      status: a.status,
      currentPeriodEnd: a.currentPeriodEnd,
      graceUntil: a.graceUntil,
      customerLinked: Boolean(a.providerCustomerId),
      updatedAt: a.updatedAt,
    })),
  });
}

/** Limited platform ops: manual hold / release hold — not arbitrary money moves. */
export async function PATCH(request: Request) {
  const session = await requirePlatformAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    tenantId?: number;
    action?: 'manual_hold' | 'release_hold';
  };
  const tenantId = Number(body.tenantId);
  if (!Number.isInteger(tenantId) || tenantId <= 0) {
    return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
  }

  let to: BillingStatus;
  if (body.action === 'manual_hold') to = 'MANUAL_HOLD';
  else if (body.action === 'release_hold') to = 'ACTIVE';
  else {
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  }

  const account = transitionBillingStatus({
    tenantId,
    to,
    actor: session.email,
    detail: `Platform action ${body.action}`,
  });

  return NextResponse.json({ ok: true, account: { tenantId, status: account.status } });
}
