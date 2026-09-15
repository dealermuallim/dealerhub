import { NextResponse } from 'next/server';

import { requirePlatformAdminSession } from '@/lib/admin-auth';
import {
  appendAudit,
  ensureBillingAccount,
  transitionBillingStatus,
} from '@/lib/billing/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Zelle = Platform Admin manual recording only (no Zelle API). */
export async function POST(request: Request) {
  const session = await requirePlatformAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    tenantId?: number;
    reference?: string;
    note?: string;
    markActive?: boolean;
  };
  const tenantId = Number(body.tenantId);
  if (!Number.isInteger(tenantId) || tenantId <= 0) {
    return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
  }
  const reference = String(body.reference || '').trim().slice(0, 120);
  if (!reference) {
    return NextResponse.json({ error: 'reference required' }, { status: 400 });
  }

  const account = ensureBillingAccount(tenantId);
  appendAudit({
    tenantId,
    billingAccountId: account.billingAccountId,
    actor: session.email,
    action: 'ZELLE_MANUAL_RECORD',
    fromStatus: account.status,
    toStatus: body.markActive ? 'ACTIVE' : account.status,
    detail: `Zelle ref ${reference}; ${String(body.note || '').slice(0, 200)}`,
    providerEventId: null,
  });

  if (body.markActive) {
    transitionBillingStatus({
      tenantId,
      to: 'ACTIVE',
      actor: session.email,
      detail: `Zelle settlement recorded (${reference})`,
    });
  }

  return NextResponse.json({ ok: true });
}
