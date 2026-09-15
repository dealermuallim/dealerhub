import { PUBLIC_UNAVAILABLE_MESSAGE } from '@/lib/incidents';

/**
 * Neutral public fail-closed page.
 * Never include host, tenant names, Oracle codes, or stack traces.
 */
export default function WebsiteUnavailable() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '40px',
        fontFamily: 'system-ui, sans-serif',
        background: '#f8fafc',
        color: '#0f172a',
      }}
    >
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 12px' }}>
          Website temporarily unavailable
        </h1>
        <p style={{ margin: 0, lineHeight: 1.5, color: '#334155' }}>
          {PUBLIC_UNAVAILABLE_MESSAGE}
        </p>
      </div>
    </main>
  );
}
