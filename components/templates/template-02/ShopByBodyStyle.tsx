import Link from 'next/link';
import { BODY_STYLES } from './demo-inventory';
import type { TemplateTheme } from './theme';

type Props = { theme: TemplateTheme };

export default function ShopByBodyStyle({ theme }: Props) {
  return (
    <section className="t02-section t02-section-soft" style={{ background: theme.soft }}>
      <div className="t02-wrap">
        <div className="t02-section-head">
          <h2 style={{ color: theme.ink }}>Shop by Body Style</h2>
          <p style={{ color: theme.muted }}>
            Start with the type of vehicle that fits your life.
          </p>
        </div>
        <div className="t02-chip-grid">
          {BODY_STYLES.map((style) => (
            <Link
              key={style}
              href={`/inventory?body=${encodeURIComponent(style)}`}
              className="t02-chip"
              style={{
                borderColor: theme.line,
                color: theme.ink,
                background: theme.surface,
              }}
            >
              {style}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
