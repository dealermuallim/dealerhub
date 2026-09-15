import type { TemplateTheme } from './theme';

type Props = { theme: TemplateTheme };

const STEPS = [
  {
    n: '1',
    title: 'Find It',
    body: 'Browse inventory, filter by budget and body style, or send us a request.',
  },
  {
    n: '2',
    title: 'Finance It',
    body: 'Explore payment options and get pre-qualified with a clear monthly target.',
  },
  {
    n: '3',
    title: 'Trade It',
    body: "Apply your current vehicle's value toward your next ride.",
  },
  {
    n: '4',
    title: 'Pick Up / Delivery',
    body: 'Finalize paperwork and choose pickup or local delivery where available.',
  },
] as const;

export default function HowItWorks({ theme }: Props) {
  return (
    <section className="t02-section t02-section-soft" id="how-it-works" style={{ background: theme.soft }}>
      <div className="t02-wrap">
        <div className="t02-section-head">
          <h2 style={{ color: theme.ink }}>How It Works</h2>
          <p style={{ color: theme.muted }}>A simple path from browsing to driving.</p>
        </div>
        <div className="t02-steps">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="t02-step"
              style={{ background: theme.surface, borderColor: theme.line }}
            >
              <span className="t02-step-n" style={{ background: theme.secondary }}>
                {step.n}
              </span>
              <h3 style={{ color: theme.ink }}>{step.title}</h3>
              <p style={{ color: theme.muted }}>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
