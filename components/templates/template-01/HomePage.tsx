import Link from 'next/link';
import type { PublicTenant } from '@/lib/tenant';

type Props = {
  tenant: PublicTenant;
};

export default function Template01HomePage({ tenant }: Props) {
  const title = tenant.WEBSITE_TITLE || tenant.DEALER_NAME;

  return (
    <main
      style={{
        padding: '60px 24px',
        maxWidth: 960,
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h1 style={{ marginBottom: 12 }}>{title}</h1>
      <p style={{ color: '#475569', marginBottom: 28 }}>
        Template 01 — Classic Marketplace
      </p>
      {tenant.WEBSITE_TAGLINE ? (
        <p style={{ fontSize: 18, marginBottom: 32 }}>{tenant.WEBSITE_TAGLINE}</p>
      ) : null}
      <p style={{ marginBottom: 24 }}>
        Browse our live inventory for this dealership. Listings are loaded for the
        current website host only.
      </p>
      <Link
        href="/inventory"
        style={{
          display: 'inline-block',
          background: tenant.PRIMARY_COLOR || '#0f172a',
          color: '#fff',
          padding: '12px 18px',
          borderRadius: 8,
          textDecoration: 'none',
          fontWeight: 700,
        }}
      >
        View Inventory
      </Link>
    </main>
  );
}
