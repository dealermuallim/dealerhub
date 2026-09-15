'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import StatusBadge from '@/components/admin/StatusBadge';

type TenantRow = {
  tenantId: number;
  tenantCode: string | null;
  dealerName: string | null;
  activeYn: string | null;
  domainName: string | null;
  domainType: string | null;
  templateCode: string | null;
  createdAt: string | null;
};

function dash(value: string | null | undefined): string {
  return value && String(value).trim() ? String(value) : '—';
}

function isPublicishDomain(domain: string | null): boolean {
  if (!domain) return false;
  const d = domain.toLowerCase();
  if (d.endsWith('.test') || d.endsWith('.invalid') || d.endsWith('.local')) return false;
  if (d === 'localhost') return true;
  return d.includes('.');
}

export default function TenantsTable() {
  const [tenants, setTenants] = useState<TenantRow[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/admin/tenants', { method: 'GET' });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          tenants?: TenantRow[];
          error?: string;
        };
        if (!res.ok || !data.ok) {
          if (!cancelled) setError(data.error || 'Unable to load tenants.');
          if (!cancelled) setTenants([]);
          return;
        }
        if (!cancelled) setTenants(data.tenants || []);
      } catch {
        if (!cancelled) {
          setError('Unable to load tenants.');
          setTenants([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="adm-muted">Loading dealers…</p>;
  }

  if (error) {
    return (
      <p className="adm-muted" style={{ color: '#b91c1c', margin: 0 }}>
        {error}
      </p>
    );
  }

  if (!tenants || tenants.length === 0) {
    return (
      <p className="adm-muted" style={{ margin: 0 }}>
        No dealers yet. Create the first dealer to get started.
      </p>
    );
  }

  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Dealer</th>
            <th>Tenant code</th>
            <th>Domain</th>
            <th>Type</th>
            <th>Template</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((t) => (
            <tr key={t.tenantId}>
              <td>{t.tenantId}</td>
              <td>
                <strong>{dash(t.dealerName)}</strong>
              </td>
              <td>{dash(t.tenantCode)}</td>
              <td>{dash(t.domainName)}</td>
              <td>{dash(t.domainType)}</td>
              <td>{dash(t.templateCode)}</td>
              <td>
                <StatusBadge kind={t.activeYn === 'Y' ? 'ACTIVE' : 'INACTIVE'} />
              </td>
              <td>
                {t.createdAt
                  ? new Date(t.createdAt).toLocaleDateString()
                  : '—'}
              </td>
              <td>
                <div className="adm-row-actions">
                  {isPublicishDomain(t.domainName) ? (
                    <Link
                      href={
                        t.domainName === 'localhost'
                          ? '/'
                          : `https://${t.domainName}`
                      }
                      className="adm-btn adm-btn-ghost adm-btn-sm"
                    >
                      Website
                    </Link>
                  ) : (
                    <span className="adm-muted" style={{ fontSize: 12 }}>
                      Domain not public
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}