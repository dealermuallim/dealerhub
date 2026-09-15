import Link from 'next/link';
import type { PublicTenant } from '@/lib/tenant';
import type { TemplateTheme } from './theme';

type Props = {
  tenant: PublicTenant;
  theme: TemplateTheme;
};

const NAV = [
  { href: '/inventory', label: 'Buy' },
  { href: '#sell-trade', label: 'Sell / Trade' },
  { href: '#financing', label: 'Finance' },
  { href: '#find-it', label: 'Find It For Me' },
  { href: '#how-it-works', label: 'How It Works' },
] as const;

export default function SiteHeader({ tenant, theme }: Props) {
  const title = tenant.WEBSITE_TITLE || tenant.DEALER_NAME;

  return (
    <header
      className="t02-header"
      style={{ background: theme.surface, borderBottom: `1px solid ${theme.line}` }}
    >
      <div className="t02-wrap t02-header-inner">
        <Link href="/" className="t02-logo" style={{ color: theme.ink }}>
          <span className="t02-logo-mark" style={{ background: theme.secondary }} />
          <span>
            <strong>{title}</strong>
            {tenant.WEBSITE_TAGLINE ? (
              <small style={{ color: theme.muted }}>{tenant.WEBSITE_TAGLINE}</small>
            ) : null}
          </span>
        </Link>

        <nav className="t02-nav" aria-label="Primary">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} style={{ color: theme.ink }}>
              {item.label}
            </Link>
          ))}
        </nav>

        {tenant.PHONE ? (
          <a className="t02-phone" href={`tel:${tenant.PHONE}`} style={{ color: theme.secondary }}>
            {tenant.PHONE}
          </a>
        ) : (
          <Link
            href="/inventory"
            className="t02-header-cta"
            style={{ background: theme.secondary, color: '#fff' }}
          >
            {tenant.PRIMARY_CTA_TEXT || 'Shop Inventory'}
          </Link>
        )}
      </div>
    </header>
  );
}
