import { headers } from 'next/headers';

import { getPublicTenantByHost } from '@/lib/tenant';
import WebsiteUnavailable from '@/components/public/WebsiteUnavailable';

import TemplateRenderer from '@/components/templates/TemplateRenderer';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const requestHeaders = await headers();

  const host =
    requestHeaders.get('host') ||
    'localhost';

  let tenant;

  try {
    tenant = await getPublicTenantByHost(host);
  } catch (error) {
    // Unexpected failures: log internally; public stays neutral.
    console.error('HomePage tenant resolve failed:', error);
    return <WebsiteUnavailable />;
  }

  if (!tenant) {
    return <WebsiteUnavailable />;
  }

  return (
    <TemplateRenderer
      tenant={tenant}
    />
  );
}
