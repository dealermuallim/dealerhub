import Link from 'next/link';
import type { TemplateTheme } from './theme';

type Props = { theme: TemplateTheme };

export default function FinancingSection({ theme }: Props) {
  return (
    <section className="t02-band" id="financing" style={{ background: theme.primary }}>
      <div className="t02-wrap t02-band-inner">
        <div>
          <h2>Financing Made Simple</h2>
          <p>
            Get clarity on payments before you visit. Pre-qualify and shop with a budget that
            works for you.
          </p>
        </div>
        <Link href="#find-it" className="t02-btn t02-btn-light">
          Get Pre-Qualified
        </Link>
      </div>
    </section>
  );
}
