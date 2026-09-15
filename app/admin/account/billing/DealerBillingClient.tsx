'use client';

import { useState } from 'react';

type HistoryRow = {
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  detail: string;
  createdAt: string;
};

export default function DealerBillingClient(props: {
  status: string;
  paymentRequired: boolean;
  suspended: boolean;
  periodEnd: string | null;
  graceUntil: string | null;
  providerMode: string;
  history: HistoryRow[];
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function payNow() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/account/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Checkout failed');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setMessage('No checkout URL returned');
    } catch {
      setMessage('Checkout failed');
    } finally {
      setBusy(false);
    }
  }

  async function manageBilling() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/account/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Portal failed');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setMessage('No portal URL returned');
    } catch {
      setMessage('Portal failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ marginTop: 0 }}>Account billing</h1>
      {props.suspended ? (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <strong>PAYMENT REQUIRED</strong>
          <p style={{ marginBottom: 0 }}>
            Admin tools are locked until settlement is confirmed by the payment
            provider. The public dealership site stays online.
          </p>
        </div>
      ) : null}

      <section
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <p>
          <strong>Status:</strong> {props.status}
        </p>
        <p>
          <strong>Period end:</strong> {props.periodEnd || '—'}
        </p>
        <p>
          <strong>Grace until:</strong> {props.graceUntil || '—'}
        </p>
        <p style={{ color: '#64748b', fontSize: 13 }}>
          Provider mode: {props.providerMode} (test/mock — no live charges from this UI alone)
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" disabled={busy} onClick={() => void payNow()}>
            Pay Now
          </button>
          <button type="button" disabled={busy} onClick={() => void manageBilling()}>
            Update Payment Method / Manage Billing
          </button>
        </div>
        {message ? <p style={{ color: '#b91c1c' }}>{message}</p> : null}
      </section>

      <section>
        <h2 style={{ fontSize: 16 }}>History</h2>
        {props.history.length === 0 ? (
          <p style={{ color: '#64748b' }}>No billing events yet.</p>
        ) : (
          <ul style={{ paddingLeft: 18 }}>
            {props.history.map((h, idx) => (
              <li key={idx} style={{ marginBottom: 8, fontSize: 14 }}>
                {h.createdAt}: {h.fromStatus || '—'} → {h.toStatus || '—'} ({h.action}) —{' '}
                {h.detail}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
