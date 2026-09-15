import Link from 'next/link';
import type { PublicTenant } from '@/lib/tenant';
import type { TemplateTheme } from './theme';

type Props = {
  tenant: PublicTenant;
  theme: TemplateTheme;
};

export default function HeroSection({ tenant, theme }: Props) {
  const headline = tenant.HERO_HEADLINE || 'Your Next Car Starts Here';
  const sub =
    tenant.HERO_SUBHEADLINE ||
    tenant.WEBSITE_TAGLINE ||
    'Search quality vehicles — shop by budget, body style, or tell us what you need.';
  const image =
    tenant.HERO_IMAGE_URL ||
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=80';

  return (
    <section className="t02-hero">
      <div
        className="t02-hero-media"
        style={{
          backgroundImage: `linear-gradient(105deg, rgba(15,23,42,.82), rgba(15,23,42,.35)), url(${image})`,
        }}
      />
      <div className="t02-wrap t02-hero-content">
        <p className="t02-kicker" style={{ color: theme.secondary }}>
          {tenant.CITY && tenant.STATE_CODE
            ? `Serving ${tenant.CITY}, ${tenant.STATE_CODE}`
            : tenant.DEALER_NAME}
        </p>
        <h1>{headline}</h1>
        <p className="t02-hero-sub">{sub}</p>

        <form className="t02-search" action="/inventory" method="get" role="search">
          <label>
            <span>Make</span>
            <input name="make" placeholder="Any make" />
          </label>
          <label>
            <span>Model</span>
            <input name="model" placeholder="Any model" />
          </label>
          <label className="t02-search-wide">
            <span>Keyword / Stock #</span>
            <input name="q" placeholder="Body style, keyword, or stock #" />
          </label>
          <div className="t02-search-actions">
            <button type="submit" style={{ background: theme.secondary, color: '#fff' }}>
              Shop All Cars
            </button>
            <Link href="#find-it" className="t02-btn-ghost">
              Find It For Me
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}
