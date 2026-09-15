import { NextResponse } from 'next/server';

import { clearAdminSessionCookieHeader } from '@/lib/admin-auth';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const loginUrl = new URL('/admin/login', url.origin);
  const res = NextResponse.redirect(loginUrl, 303);
  res.headers.set('Set-Cookie', clearAdminSessionCookieHeader());
  return res;
}