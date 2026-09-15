import Link from 'next/link';

export default function BillingSupportPage() {
  return (
    <main style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Payment support</h1>
      <p>
        If your admin access is locked for payment, use{' '}
        <Link href="/admin/account/billing">Account billing</Link> to pay or update
        your method. For help, contact platform support.
      </p>
    </main>
  );
}
