'use client';

import { useState, type CSSProperties } from 'react';

type AccountRow = {
  tenantId: number;
  status: string;
  currentPeriodEnd: string | null;
  graceUntil: string | null;
  customerLinked: boolean;
  updatedAt: string;
};

export default function PlatformBillingClient(props: {
  providerMode: string;
  summary: { byStatus: Record<string, number>; totalAccounts: number; note: string };
  accounts: AccountRow[];
}) {
  const [accounts, setAccounts] = useState(props.accounts);
  const [summary, setSummary] = useState(props.summary);
  const [zelleTenant, setZelleTenant] = useState('');
  const [zelleRef, setZelleRef] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch('/api/admin/billing', { cache: 'no-store' });
    if (res.status === 403) {
      setMessage('Forbidden');
      return;
    }
    const data = await res.json();
    setAccounts(data.accounts || []);
    setSummary(data.summary);
  }

  async function hold(tenantId: number, action: 'manual_hold' | 'release_hold') {
    const res = await fetch('/api/admin/billing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, action }),
    });
    const data = await res.json();
    setMessage(res.ok ? `Updated tenant ${tenantId}` : data.error || 'Failed');
    await refresh();
  }

  async function recordZelle() {
    const tenantId = Number(zelleTenant);
    const res = await fetch('/api/admin/billing/manual-zelle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        reference: zelleRef,
        markActive: true,
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? 'Zelle recorded' : data.error || 'Failed');
    await refresh();
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>Platform billing</h1>
      <p style={{ color: '#64748b' }}>
        Provider: {props.providerMode}. {summary.note}
      </p>

      <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={cardStyle}>
          <div style={cardLabel}>Accounts</div>
          <div style={cardValue}>{summary.totalAccounts}</div>
        </div>
        {Object.entries(summary.byStatus).map(([k, v]) => (
          <div key={k} style={cardStyle}>
            <div style={cardLabel}>{k}</div>
            <div style={cardValue}>{v}</div>
          </div>
        ))}
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16 }}>Accounts</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              <th align="left">Tenant</th>
              <th align="left">Status</th>
              <th align="left">Period end</th>
              <th align="left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.tenantId}>
                <td>{a.tenantId}</td>
                <td>{a.status}</td>
                <td>{a.currentPeriodEnd || '—'}</td>
                <td>
                  <button type="button" onClick={() => void hold(a.tenantId, 'manual_hold')}>
                    Hold
                  </button>{' '}
                  <button type="button" onClick={() => void hold(a.tenantId, 'release_hold')}>
                    Release
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 style={{ fontSize: 16 }}>Manual Zelle record</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            placeholder="Tenant ID"
            value={zelleTenant}
            onChange={(e) => setZelleTenant(e.target.value)}
          />
          <input
            placeholder="Zelle reference"
            value={zelleRef}
            onChange={(e) => setZelleRef(e.target.value)}
          />
          <button type="button" onClick={() => void recordZelle()}>
            Record + mark ACTIVE
          </button>
        </div>
      </section>

      {message ? <p>{message}</p> : null}
    </main>
  );
}

const cardStyle: CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: '12px 16px',
  minWidth: 120,
  background: '#f8fafc',
};
const cardLabel: CSSProperties = { fontSize: 12, color: '#64748b' };
const cardValue: CSSProperties = { fontSize: 22, fontWeight: 700 };
