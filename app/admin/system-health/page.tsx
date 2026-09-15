import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import {
  ADMIN_SESSION_COOKIE,
  isPlatformAdminSession,
  parseAndVerifySessionToken,
} from '@/lib/admin-auth';
import { getDeployInfo } from '@/lib/incidents/deploy-info';
import { runHealthChecks } from '@/lib/incidents/health';
import { listIncidents } from '@/lib/incidents/store';
import SystemHealthClient from './SystemHealthClient';

export const dynamic = 'force-dynamic';

export default async function SystemHealthPage() {
  const jar = await cookies();
  const token = jar.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await parseAndVerifySessionToken(token);

  if (!session) {
    redirect('/admin/login');
  }

  if (!isPlatformAdminSession(session)) {
    return (
      <main style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 20 }}>Forbidden</h1>
        <p>System Health is limited to Platform Admins.</p>
        <p>
          <Link href="/admin">Back to admin</Link>
        </p>
      </main>
    );
  }

  const health = await runHealthChecks();
  const incidents = listIncidents(25);
  const deploy = getDeployInfo();

  return (
    <SystemHealthClient
      initialOverall={health.overall}
      initialChecks={health.checks}
      initialIncidents={incidents}
      deploy={deploy}
    />
  );
}
