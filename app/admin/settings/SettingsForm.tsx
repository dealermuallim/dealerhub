'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import AdminButton from '@/components/admin/AdminButton';

export type SettingsFormValues = {
  dealerName: string;
  websiteTitle: string;
  websiteTagline: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroImageUrl: string;
  primaryCtaText: string;
  primaryColor: string;
  secondaryColor: string;
  templateCode: string;
  phone: string;
  email: string;
  city: string;
  state: string;
};

type Props = {
  initial: SettingsFormValues;
  subtitleHost: string;
};

const EDITABLE = [
  'websiteTitle',
  'websiteTagline',
  'heroHeadline',
  'heroSubheadline',
  'heroImageUrl',
  'primaryColor',
  'secondaryColor',
  'primaryCtaText',
  'templateCode',
] as const;

export default function SettingsForm({ initial }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const payload: Record<string, string> = {};
    for (const key of EDITABLE) {
      payload[key] = String(fd.get(key) ?? '').trim();
    }

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setMessage({
          type: 'err',
          text: data.error || 'Unable to save settings.',
        });
        setPending(false);
        return;
      }
      setMessage({ type: 'ok', text: 'Settings saved.' });
      setPending(false);
      router.refresh();
    } catch {
      setMessage({ type: 'err', text: 'Unable to save settings.' });
      setPending(false);
    }
  }

  return (
    <form className="adm-form" onSubmit={onSubmit}>
      <div className="adm-form-grid">
        <label>
          Dealer Name
          <input name="dealerName" defaultValue={initial.dealerName} readOnly />
        </label>
        <label>
          Website Title
          <input name="websiteTitle" defaultValue={initial.websiteTitle} />
        </label>
        <label>
          Website Tagline
          <input name="websiteTagline" defaultValue={initial.websiteTagline} />
        </label>
        <label>
          Hero Headline
          <input name="heroHeadline" defaultValue={initial.heroHeadline} />
        </label>
        <label>
          Hero Subheadline
          <input name="heroSubheadline" defaultValue={initial.heroSubheadline} />
        </label>
        <label>
          Hero Image URL
          <input
            name="heroImageUrl"
            placeholder="https://..."
            defaultValue={initial.heroImageUrl}
          />
        </label>
        <label>
          Primary CTA Text
          <input name="primaryCtaText" defaultValue={initial.primaryCtaText} />
        </label>
        <label>
          Primary Color
          <input name="primaryColor" defaultValue={initial.primaryColor} />
        </label>
        <label>
          Secondary Color
          <input name="secondaryColor" defaultValue={initial.secondaryColor} />
        </label>
        <label>
          Template
          <select name="templateCode" defaultValue={initial.templateCode}>
            <option value=""> </option>
            <option value="TEMPLATE_01">TEMPLATE_01</option>
            <option value="TEMPLATE_02">TEMPLATE_02</option>
          </select>
        </label>
      </div>

      <div className="adm-form-grid">
        <label className="adm-check">
          <input type="checkbox" name="showFeatured" disabled />
          Show Featured
        </label>
        <label className="adm-check">
          <input type="checkbox" name="showFinancing" disabled />
          Show Financing
        </label>
        <label className="adm-check">
          <input type="checkbox" name="showReviews" disabled />
          Show Reviews
        </label>
      </div>

      <div className="adm-form-grid">
        <label>
          Meta Title
          <input name="metaTitle" defaultValue="" readOnly />
        </label>
        <label>
          Meta Description
          <textarea name="metaDescription" defaultValue="" readOnly />
        </label>
      </div>

      <section className="adm-section-card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Dealer contact (display)</h3>
        <div className="adm-form-grid">
          <label>
            Phone
            <input name="phone" defaultValue={initial.phone} readOnly />
          </label>
          <label>
            Email
            <input name="email" defaultValue={initial.email} readOnly />
          </label>
          <label>
            City
            <input name="city" defaultValue={initial.city} readOnly />
          </label>
          <label>
            State
            <input name="state" defaultValue={initial.state} readOnly />
          </label>
        </div>
      </section>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="submit"
          className="adm-btn adm-btn-primary"
          disabled={pending}
        >
          {pending ? 'Saving…' : 'Save Settings'}
        </button>
        <AdminButton href="/" variant="ghost">
          View Public Website
        </AdminButton>
      </div>
      {message ? (
        <p
          className="adm-muted"
          style={{
            margin: 0,
            fontSize: 13,
            color: message.type === 'ok' ? '#15803d' : '#b91c1c',
          }}
        >
          {message.text}
        </p>
      ) : (
        <p className="adm-muted" style={{ margin: 0, fontSize: 13 }}>
          Saves website presentation fields for the current Host tenant only.
        </p>
      )}
    </form>
  );
}