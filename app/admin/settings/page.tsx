import { headers } from 'next/headers';

import AdminShell from '@/components/admin/AdminShell';
import SectionCard from '@/components/admin/SectionCard';
import { getPublicTenantByHost } from '@/lib/tenant';
import SettingsForm from './SettingsForm';

export const dynamic = 'force-dynamic';

function val(value: string | null | undefined): string {
  return value ?? '';
}

export default async function AdminSettingsPage() {
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') || 'localhost';
  const tenant = await getPublicTenantByHost(host);

  const dealerName = val(tenant?.DEALER_NAME);
  const subtitle = tenant
    ? `${dealerName || tenant.TENANT_CODE} · live tenant`
    : `No tenant for host ${host}`;

  return (
    <AdminShell title="Website Settings" subtitle={subtitle}>
      <SectionCard title="Branding & hero">
        <SettingsForm
          subtitleHost={host}
          initial={{
            dealerName,
            websiteTitle: val(tenant?.WEBSITE_TITLE),
            websiteTagline: val(tenant?.WEBSITE_TAGLINE),
            heroHeadline: val(tenant?.HERO_HEADLINE),
            heroSubheadline: val(tenant?.HERO_SUBHEADLINE),
            heroImageUrl: val(tenant?.HERO_IMAGE_URL),
            primaryCtaText: val(tenant?.PRIMARY_CTA_TEXT),
            primaryColor: val(tenant?.PRIMARY_COLOR),
            secondaryColor: val(tenant?.SECONDARY_COLOR),
            templateCode: val(tenant?.TEMPLATE_CODE),
            phone: val(tenant?.PHONE),
            email: val(tenant?.EMAIL),
            city: val(tenant?.CITY),
            state: val(tenant?.STATE_CODE),
          }}
        />
      </SectionCard>
    </AdminShell>
  );
}