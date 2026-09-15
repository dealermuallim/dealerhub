import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { parseAndVerifySessionToken, ADMIN_SESSION_COOKIE } from '@/lib/admin-auth';
import AdminLoginForm from './LoginForm';
import '@/components/admin/admin.css';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  const jar = await cookies();
  const token = jar.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await parseAndVerifySessionToken(token);
  if (session) {
    redirect('/admin');
  }

  return (
    <main className="adm-login-page">
      <div className="adm-login-card">
        <div className="adm-brand" style={{ marginBottom: 20 }}>
          <strong>DealerHub Admin</strong>
          <span>Pilot sign-in</span>
        </div>
        <AdminLoginForm />
      </div>
    </main>
  );
}