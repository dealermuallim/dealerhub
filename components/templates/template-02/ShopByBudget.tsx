import Link from 'next/link';
import { BUDGET_BREAKS } from './demo-inventory';
import { money, type TemplateTheme } from './theme';

type Props = { theme: TemplateTheme };

export default function ShopByBudget({ theme }: Props) {
  return (
    <section className="t02-section" id="shop-budget">
      <div className="t02-wrap">
        <div className="t02-section-head">
          <h2 style={{ color: theme.ink }}>Shop by Budget</h2>
          <p style={{ color: theme.muted }}>
            Transparent price bands so you can browse with confidence.
          </p>
        </div>
        <div className="t02-budget-grid">
          {BUDGET_BREAKS.map((max) => (
            <Link
              key={max}
              href={`/inventory?maxPrice=${max}`}
              className="t02-budget-card"
              style={{ borderColor: theme.line, color: theme.ink }}
            >
              <span style={{ color: theme.muted }}>Under</span>
              <strong>{money(max)}</strong>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
