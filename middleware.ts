import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getAdminSessionFromRequest } from '@/lib/admin-auth';

function isProtectedApi(pathname: string, method: string): boolean {
  const m = method.toUpperCase();

  if (pathname === '/api/test-db' && m === 'GET') return true;
  if (pathname === '/api/admin/settings' && m === 'PATCH') return true;
  if (pathname === '/api/admin/tenants' && (m === 'GET' || m === 'POST')) return true;
  if (pathname === '/api/admin/system-health' && m === 'GET') return true;
  if (pathname === '/api/admin/system-health/diagnostics' && m === 'POST') return true;
  if (pathname === '/api/admin/billing' && (m === 'GET' || m === 'PATCH')) return true;
  if (pathname === '/api/admin/billing/manual-zelle' && m === 'POST') return true;
  if (pathname === '/api/admin/account/billing' && m === 'GET') return true;
  if (pathname === '/api/admin/account/billing/checkout' && m === 'POST') return true;
  if (pathname === '/api/admin/account/billing/portal' && m === 'POST') return true;
  if (pathname === '/api/v1/vin/decode' && m === 'POST') return true;
  if (pathname === '/api/v1/vehicles' && m === 'POST') return true;

  if (/^\/api\/v1\/vehicles\/[^/]+$/.test(pathname) && m === 'PATCH') return true;
  if (/^\/api\/vehicles\/[^/]+\/images$/.test(pathname) && m === 'POST') return true;
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

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  const isAdminPage =
    pathname.startsWith('/admin') && pathname !== '/admin/login';
  const apiNeedsAuth = isProtectedApi(pathname, method);

  if (!isAdminPage && !apiNeedsAuth) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  const session = await getAdminSessionFromRequest(request);

  if (session) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
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
    '/api/admin/system-health',
    '/api/admin/system-health/diagnostics',
    '/api/admin/billing',
    '/api/admin/billing/:path*',
    '/api/admin/account/billing',
    '/api/admin/account/billing/:path*',
    '/api/v1/vin/decode',
    '/api/v1/vehicles',
    '/api/v1/vehicles/:path*',
    '/api/vehicles/:path*',
  ],
};
