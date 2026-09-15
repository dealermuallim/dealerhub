'use client';

import { useMemo, useState } from 'react';

import type { HealthCheckResult, HealthState } from '@/lib/incidents/health';
import type { IncidentRecord } from '@/lib/incidents/model';
import type { DeployInfo } from '@/lib/incidents/deploy-info';

type Props = {
  initialOverall: HealthState;
  initialChecks: HealthCheckResult[];
  initialIncidents: IncidentRecord[];
  deploy: DeployInfo;
};

export default function SystemHealthClient({
  initialOverall,
  initialChecks,
  initialIncidents,
  deploy,
}: Props) {
  const [overall, setOverall] = useState(initialOverall);
  const [checks, setChecks] = useState(initialChecks);
  const [incidents, setIncidents] = useState(initialIncidents);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialIncidents[0]?.incidentId ?? null
  );
  const [detail, setDetail] = useState<IncidentRecord | null>(null);
  const [smoke, setSmoke] = useState<
    { id: string; label: string; result: string; detail: string }[] | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selected = useMemo(
    () => detail || incidents.find((i) => i.incidentId === selectedId) || null,
    [detail, incidents, selectedId]
  );

  async function refresh() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/system-health', { cache: 'no-store' });
      if (res.status === 403) {
        setMessage('Forbidden — Platform Admin only.');
        return;
      }
      const data = await res.json();
      setOverall(data.systemStatus);
      setChecks(data.checks || []);
      setIncidents(data.recentIncidents || []);
      setMessage('Refreshed (read-only).');
    } catch {
      setMessage('Refresh failed.');
    } finally {
      setBusy(false);
    }
  }

  async function runDiagnostics() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/system-health/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.status === 403) {
        setMessage('Forbidden — Platform Admin only.');
        return;
      }
      const data = await res.json();
      setOverall(data.health?.overall || overall);
      setChecks(data.health?.checks || checks);
      setSmoke(data.smoke || null);
      setMessage('Diagnostics complete — AUTO REPAIR FORBIDDEN.');
    } catch {
      setMessage('Diagnostics failed.');
    } finally {
      setBusy(false);
    }
  }

  async function loadDetail(id: string) {
    setSelectedId(id);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/system-health?incidentId=${encodeURIComponent(id)}`,
        { cache: 'no-store' }
      );
      if (!res.ok) return;
      const data = await res.json();
      setDetail(data.incident || null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
        color: '#0f172a',
        maxWidth: 1100,
        margin: '0 auto',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          alignItems: 'flex-start',
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>System Health</h1>
          <p style={{ margin: '6px 0 0', color: '#475569', fontSize: 14 }}>
            Platform Admin · read-only · AUTO REPAIR FORBIDDEN
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" disabled={busy} onClick={() => void refresh()}>
            Refresh
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runDiagnostics()}
          >
            Run Diagnostics
          </button>
        </div>
      </header>

      {message ? (
        <p style={{ color: '#334155', fontSize: 13 }}>{message}</p>
      ) : null}

      <section
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          background: '#f8fafc',
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 16 }}>SYSTEM STATUS</h2>
        <p style={{ fontSize: 28, fontWeight: 700, margin: '8px 0' }}>{overall}</p>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
          Deploy:{' '}
          {deploy.versionLabel || 'unknown'}
          {deploy.gitSha ? ` (${deploy.gitSha.slice(0, 7)})` : ''}
          {deploy.gitBranch ? ` · ${deploy.gitBranch}` : ''}
          {` · source=${deploy.source}`}
        </p>
        <ul style={{ margin: '12px 0 0', paddingLeft: 18 }}>
          {checks.map((c) => (
            <li key={c.id} style={{ marginBottom: 4, fontSize: 14 }}>
              <strong>{c.label}</strong>: {c.state}
              <span style={{ color: '#64748b' }}> — {c.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      {smoke ? (
        <section
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 16 }}>POST-DEPLOY SMOKE</h2>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {smoke.map((s) => (
              <li key={s.id} style={{ fontSize: 14 }}>
                <strong>{s.label}</strong>: {s.result}
                <span style={{ color: '#64748b' }}> — {s.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 1fr',
          gap: 16,
        }}
      >
        <section
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 16,
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 16 }}>RECENT INCIDENTS</h2>
          {incidents.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 14 }}>No recorded incidents yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {incidents.map((i) => (
                <li key={i.incidentId} style={{ marginBottom: 8 }}>
                  <button
                    type="button"
                    onClick={() => void loadDetail(i.incidentId)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: 10,
                      borderRadius: 8,
                      border:
                        selectedId === i.incidentId
                          ? '1px solid #0f172a'
                          : '1px solid #e2e8f0',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      {i.incidentId} · {i.severity} · {i.status}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      count={i.occurrenceCount} · blast={i.blastRadius} · conf=
                      {i.confidence ?? '—'}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 16,
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 16 }}>INCIDENT DETAIL</h2>
          {!selected ? (
            <p style={{ color: '#64748b', fontSize: 14 }}>Select an incident.</p>
          ) : (
            <div style={{ fontSize: 14, lineHeight: 1.45 }}>
              <p>
                <strong>{selected.incidentId}</strong> ({selected.fingerprint})
              </p>
              <p style={{ color: '#b91c1c', fontWeight: 600 }}>
                AUTO REPAIR FORBIDDEN
              </p>
              <p>
                <strong>Confidence:</strong> {selected.confidence ?? '—'}
              </p>
              <p>
                <strong>Prior root cause:</strong> {selected.rootCause}
              </p>
              <p>
                <strong>Proven solution:</strong> {selected.solution}
              </p>
              <p>
                <strong>Fix type:</strong> {selected.fixType || '—'}
              </p>
              <p>
                <strong>Runbook:</strong> {selected.runbookRef || '—'}
              </p>
              <p>
                <strong>Rollback ref:</strong> {selected.rollbackRef || '—'}
              </p>
              <p>
                <strong>Git:</strong> {selected.gitSha || '—'} / files:{' '}
                {(selected.filesRef || []).join(', ') || '—'}
              </p>
              <p>
                <strong>DB/Config:</strong> {selected.dbObjectRef || '—'} /{' '}
                {selected.configRef || '—'}
              </p>
              <p>
                <strong>Evidence:</strong> before={selected.beforeEvidenceRef || '—'}{' '}
                after={selected.afterEvidenceRef || '—'}
              </p>
              <p>
                <strong>Durations (ms):</strong> diag=
                {selected.diagnosisDurationMs ?? '—'} repair=
                {selected.repairDurationMs ?? '—'} total=
                {selected.totalDurationMs ?? '—'}
              </p>
              <p>
                <strong>QA:</strong> {selected.qaResult || 'not verified'} · verifiedBy=
                {selected.verifiedBy || '—'}
              </p>
              <p>
                <strong>First/Last:</strong> {selected.firstSeenAt || '—'} /{' '}
                {selected.lastSeenAt || '—'}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
