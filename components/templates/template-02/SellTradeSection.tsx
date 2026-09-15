import Link from 'next/link';
import type { TemplateTheme } from './theme';

type Props = { theme: TemplateTheme };

export default function SellTradeSection({ theme }: Props) {
  return (
    <section className="t02-section" id="sell-trade">
      <div
        className="t02-wrap t02-cta-card"
        style={{ background: theme.soft, borderColor: theme.line }}
      >
        <div>
          <p className="t02-kicker" style={{ color: theme.secondary }}>
            Sell / Trade
          </p>
          <h2 style={{ color: theme.ink }}>Turn Your Current Car Into Your Next One</h2>
          <p style={{ color: theme.muted }}>
            Get a fast estimate and apply it toward a vehicle you love — or walk away with cash.
          </p>
        </div>
        <Link
          href="#find-it"
          className="t02-btn"
          style={{ background: theme.secondary, color: '#fff' }}
        >
          Get My Offer
        </Link>
      </div>
    </section>
  );
}
