import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  ADMIN_SESSION_COOKIE,
  parseAndVerifySessionToken,
} from '@/lib/admin-auth';
import { evaluateDealerBillingGate } from '@/lib/billing/enforcement';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jar = await cookies();
  const hdrs = await headers();
  const pathname = hdrs.get('x-pathname') || hdrs.get('next-url') || '';
  const session = await parseAndVerifySessionToken(
    jar.get(ADMIN_SESSION_COOKIE)?.value
  );

  // Pathname may be empty on some renders; still gate known non-allowlisted patterns via referer-less check using x-invoke-path when present.
  const path =
    pathname ||
    hdrs.get('x-invoke-path') ||
    hdrs.get('x-matched-path') ||
    '';

  if (session && path.startsWith('/admin') && path !== '/admin/login') {
    const gate = evaluateDealerBillingGate({
      session,
      pathname: path || '/admin',
      isApi: false,
    });
    if (!gate.allow && gate.redirectTo) {
      // If path unknown, only hard-redirect when we can detect non-billing admin home/tools
      if (
        !path ||
        (!path.startsWith('/admin/account/billing') &&
          !path.startsWith('/admin/account/support') &&
          path !== '/admin/login')
      ) {
        redirect(gate.redirectTo);
      }
    }
  }

  return children;
}
