import { headers } from 'next/headers';

import { getPublicTenantByHost } from '@/lib/tenant';

import TemplateRenderer from '@/components/templates/TemplateRenderer';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const requestHeaders =
    await headers();

  const host =
    requestHeaders.get('host') ||
    'localhost';

  const tenant =
    await getPublicTenantByHost(
      host
    );

  if (!tenant) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '40px',
          fontFamily:
            'Arial, sans-serif',
        }}
      >
        <div>
          <h1>
            Dealer website unavailable
          </h1>

          <p>
            No active dealership is configured
            for this domain.
          </p>
        </div>
      </main>
    );
  }

  return (
    <TemplateRenderer
      tenant={tenant}
    />
  );
}