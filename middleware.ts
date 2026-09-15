import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getAdminSessionFromRequest } from '@/lib/admin-auth';

function isProtectedApi(pathname: string, method: string): boolean {
  const m = method.toUpperCase();

  if (pathname === '/api/test-db' && m === 'GET') return true;
  if (pathname === '/api/admin/settings' && m === 'PATCH') return true;
  if (pathname === '/api/admin/tenants' && (m === 'GET' || m === 'POST')) return true;
  if (pathname === '/api/v1/vin/decode' && m === 'POST') return true;
  if (pathname === '/api/v1/vehicles' && m === 'POST') return true;

  if (
    /^\/api\/v1\/vehicles\/[^/]+$/.test(pathname) &&
    m === 'PATCH'
  ) {
    return true;
  }

  if (
    /^\/api\/vehicles\/[^/]+\/images$/.test(pathname) &&
    m === 'POST'
  ) {
    return true;
  }

  if (
    /^\/api\/vehicles\/[^/]+\/images\/[^/]+$/.test(pathname) &&
    (m === 'PATCH' || m === 'DELETE')
  ) {
    return true;
  }

  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  const isAdminPage =
    pathname.startsWith('/admin') && pathname !== '/admin/login';
  const apiNeedsAuth = isProtectedApi(pathname, method);

  if (!isAdminPage && !apiNeedsAuth) {
    return NextResponse.next();
  }

  const session = await getAdminSessionFromRequest(request);

  if (session) {
    return NextResponse.next();
  }

  if (apiNeedsAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/admin/login';
  loginUrl.search = '';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/api/test-db',
    '/api/admin/settings',
    '/api/admin/tenants',
    '/api/v1/vin/decode',
    '/api/v1/vehicles',
    '/api/v1/vehicles/:path*',
    '/api/vehicles/:path*',
  ],
};