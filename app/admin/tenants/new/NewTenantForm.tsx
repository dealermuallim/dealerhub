'use client';

import { FormEvent, useState } from 'react';
import AdminButton from '@/components/admin/AdminButton';

type SuccessInfo = {
  tenantId: number;
  tenantCode: string;
  domainName: string;
};

function isPublicishDomain(domain: string): boolean {
  const d = domain.toLowerCase();
  if (d.endsWith('.test') || d.endsWith('.invalid') || d.endsWith('.local')) return false;
  if (d === 'localhost') return true;
  return d.includes('.');
}

export default function NewTenantForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<SuccessInfo | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError('');
    setSuccess(null);
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      dealerName: String(fd.get('dealerName') || ''),
      legalName: String(fd.get('legalName') || ''),
      tenantCode: String(fd.get('tenantCode') || ''),
      dealerLicenseNo: String(fd.get('dealerLicenseNo') || ''),
      phone: String(fd.get('phone') || ''),
      textPhone: String(fd.get('textPhone') || ''),
      email: String(fd.get('email') || ''),
      addressLine1: String(fd.get('addressLine1') || ''),
      addressLine2: String(fd.get('addressLine2') || ''),
      city: String(fd.get('city') || ''),
      stateCode: String(fd.get('stateCode') || ''),
      zipCode: String(fd.get('zipCode') || ''),
      logoUrl: String(fd.get('logoUrl') || ''),
      primaryColor: String(fd.get('primaryColor') || ''),
      secondaryColor: String(fd.get('secondaryColor') || ''),
      timezoneName: String(fd.get('timezoneName') || 'America/New_York'),
      activeYn: String(fd.get('activeYn') || 'Y'),
      domainName: String(fd.get('domainName') || ''),
      domainType: String(fd.get('domainType') || 'PUBLIC'),
      isPrimary: String(fd.get('isPrimary') || 'Y'),
      websiteTitle: String(fd.get('websiteTitle') || ''),
      websiteTagline: String(fd.get('websiteTagline') || ''),
      heroHeadline: String(fd.get('heroHeadline') || ''),
      heroSubheadline: String(fd.get('heroSubheadline') || ''),
      heroImageUrl: String(fd.get('heroImageUrl') || ''),
      settingsPrimaryColor: String(fd.get('settingsPrimaryColor') || ''),
      settingsSecondaryColor: String(fd.get('settingsSecondaryColor') || ''),
      primaryCtaText: String(fd.get('primaryCtaText') || ''),
      templateCode: String(fd.get('templateCode') || 'TEMPLATE_02'),
      showFeaturedYn: String(fd.get('showFeaturedYn') || 'Y'),
      showFinancingYn: String(fd.get('showFinancingYn') || 'Y'),
      showReviewsYn: String(fd.get('showReviewsYn') || 'N'),
    };

    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        tenantId?: number;
        tenantCode?: string;
        domainName?: string;
      };
      if (!res.ok || !data.ok || !data.tenantId) {
        setError(data.error || 'Unable to create dealer.');
        setPending(false);
        return;
      }
      setSuccess({
        tenantId: data.tenantId,
        tenantCode: data.tenantCode || payload.tenantCode,
        domainName: data.domainName || payload.domainName,
      });
      setPending(false);
    } catch {
      setError('Unable to create dealer.');
      setPending(false);
    }
  }

  if (success) {
    const canView = isPublicishDomain(success.domainName);
    return (
      <div className="adm-form">
        <p style={{ color: '#15803d', marginTop: 0 }}>
          Dealer created successfully. TENANT_ID: <strong>{success.tenantId}</strong>
          {' '}({success.tenantCode} / {success.domainName})
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <AdminButton href="/admin/tenants">Back to Dealers</AdminButton>
          {canView ? (
            <AdminButton
              href={success.domainName === 'localhost' ? '/' : `https://${success.domainName}`}
              variant="secondary"
            >
              View Website
            </AdminButton>
          ) : (
            <span className="adm-muted" style={{ fontSize: 13, alignSelf: 'center' }}>
              Domain is not treated as publicly reachable.
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <form className="adm-form" onSubmit={onSubmit}>
      <SectionTitle>Dealer profile</SectionTitle>
      <div className="adm-form-grid">
        <label>
          Dealer Name
          <input name="dealerName" required disabled={pending} />
        </label>
        <label>
          Legal Name
          <input name="legalName" disabled={pending} />
        </label>
        <label>
          Tenant Code
          <input name="tenantCode" placeholder="SHELBYMOTOR" required disabled={pending} />
        </label>
        <label>
          Dealer License No
          <input name="dealerLicenseNo" disabled={pending} />
        </label>
        <label>
          Phone
          <input name="phone" disabled={pending} />
        </label>
        <label>
          Text Phone
          <input name="textPhone" disabled={pending} />
        </label>
        <label>
          Email
          <input name="email" type="email" disabled={pending} />
        </label>
        <label>
          Address Line 1
          <input name="addressLine1" disabled={pending} />
        </label>
        <label>
          Address Line 2
          <input name="addressLine2" disabled={pending} />
        </label>
        <label>
          City
          <input name="city" disabled={pending} />
        </label>
        <label>
          State
          <input name="stateCode" maxLength={2} disabled={pending} />
        </label>
        <label>
          ZIP
          <input name="zipCode" disabled={pending} />
        </label>
        <label>
          Logo URL
          <input name="logoUrl" placeholder="https://..." disabled={pending} />
        </label>
        <label>
          Primary Color
          <input name="primaryColor" placeholder="#0f172a" disabled={pending} />
        </label>
        <label>
          Secondary Color
          <input name="secondaryColor" placeholder="#16a34a" disabled={pending} />
        </label>
        <label>
          Timezone
          <input name="timezoneName" defaultValue="America/New_York" disabled={pending} />
        </label>
        <label>
          Active
          <select name="activeYn" defaultValue="Y" disabled={pending}>
            <option value="Y">Y</option>
            <option value="N">N</option>
          </select>
        </label>
      </div>

      <SectionTitle>Domain</SectionTitle>
      <div className="adm-form-grid">
        <label>
          Domain Name
          <input name="domainName" placeholder="dealer.example.com" required disabled={pending} />
        </label>
        <label>
          Domain Type
          <select name="domainType" defaultValue="PUBLIC" disabled={pending}>
            <option value="PUBLIC">PUBLIC</option>
            <option value="ERP">ERP</option>
            <option value="ALIAS">ALIAS</option>
          </select>
        </label>
        <label>
          Primary Domain
          <select name="isPrimary" defaultValue="Y" disabled={pending}>
            <option value="Y">Y</option>
            <option value="N">N</option>
          </select>
        </label>
      </div>

      <SectionTitle>Website settings</SectionTitle>
      <div className="adm-form-grid">
        <label>
          Website Title
          <input name="websiteTitle" disabled={pending} />
        </label>
        <label>
          Website Tagline
          <input name="websiteTagline" disabled={pending} />
        </label>
        <label>
          Hero Headline
          <input name="heroHeadline" disabled={pending} />
        </label>
        <label>
          Hero Subheadline
          <input name="heroSubheadline" disabled={pending} />
        </label>
        <label>
          Hero Image URL
          <input name="heroImageUrl" disabled={pending} />
        </label>
        <label>
          Website Primary Color
          <input name="settingsPrimaryColor" placeholder="#0f172a" disabled={pending} />
        </label>
        <label>
          Website Secondary Color
          <input name="settingsSecondaryColor" placeholder="#16a34a" disabled={pending} />
        </label>
        <label>
          Primary CTA
          <input name="primaryCtaText" disabled={pending} />
        </label>
        <label>
          Template
          <select name="templateCode" defaultValue="TEMPLATE_02" disabled={pending}>
            <option value="TEMPLATE_01">TEMPLATE_01</option>
            <option value="TEMPLATE_02">TEMPLATE_02</option>
          </select>
        </label>
        <label>
          Show Featured
          <select name="showFeaturedYn" defaultValue="Y" disabled={pending}>
            <option value="Y">Y</option>
            <option value="N">N</option>
          </select>
        </label>
        <label>
          Show Financing
          <select name="showFinancingYn" defaultValue="Y" disabled={pending}>
            <option value="Y">Y</option>
            <option value="N">N</option>
          </select>
        </label>
        <label>
          Show Reviews
          <select name="showReviewsYn" defaultValue="N" disabled={pending}>
            <option value="Y">Y</option>
            <option value="N">N</option>
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="submit" className="adm-btn adm-btn-primary" disabled={pending}>
          {pending ? 'Creating dealer…' : 'CREATE DEALER'}
        </button>
        <AdminButton href="/admin/tenants" variant="ghost">
          Cancel
        </AdminButton>
      </div>
      {error ? (
        <p className="adm-muted" style={{ color: '#b91c1c', margin: 0, fontSize: 13 }}>
          {error}
        </p>
      ) : (
        <p className="adm-muted" style={{ margin: 0, fontSize: 13 }}>
          Creates tenant + domain + website settings via Oracle platform package.
        </p>
      )}
    </form>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ margin: '8px 0 4px', fontSize: 15 }}>{children}</h3>
  );
}