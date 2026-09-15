import { NextResponse } from 'next/server';

import {
  createSessionSetCookieHeader,
  resolveAdminRoleForCredentials,
} from '@/lib/admin-auth';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = String(body.email || '').trim();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const role = await resolveAdminRoleForCredentials(email, password);
    if (!role) {
      return NextResponse.json(
        { ok: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const setCookie = await createSessionSetCookieHeader({
      email: email.toLowerCase(),
      role,
    });

    const res = NextResponse.json({ ok: true, role });
    res.headers.set('Set-Cookie', setCookie);
    return res;
  } catch (error) {
    console.error('[admin/login] failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to sign in.' },
      { status: 500 }
    );
  }
}
