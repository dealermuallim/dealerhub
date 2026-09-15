import { NextResponse } from 'next/server';

import { requireAdminSession } from '@/lib/admin-auth';

import { evaluateDealerBillingGate } from './enforcement';

/** Centralized API billing gate — returns a response when blocked, else null. */
export async function denyIfDealerBillingBlocked(
  request: Request,
  pathname: string
): Promise<NextResponse | null> {
  const session = await requireAdminSession(request);
  const gate = evaluateDealerBillingGate({
    session,
    pathname,
    isApi: true,
  });
  if (gate.allow) return null;
  if (gate.statusCode === 401) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(
    {
      error: 'payment_required',
      status: gate.status,
      billingPath: '/admin/account/billing',
    },
    { status: 402 }
  );
}
