import type { TemplateTheme } from './theme';

type Props = { theme: TemplateTheme };

const PERKS = [
  'Paperwork handled',
  'Financing support',
  'Registration assistance',
  'Plates guidance',
  'Local delivery where available',
] as const;

export default function DeliverySection({ theme }: Props) {
  return (
    <section className="t02-section" id="delivery">
      <div className="t02-wrap t02-two-col">
        <div>
          <p className="t02-kicker" style={{ color: theme.secondary }}>
            Convenience
          </p>
          <h2 style={{ color: theme.ink }}>Need It Fast?</h2>
          <p style={{ color: theme.muted, fontSize: 18, lineHeight: 1.6 }}>
            We help you move quickly from decision to driveway — with support for the details that
            usually slow people down.
          </p>
        </div>
        <ul className="t02-perk-list">
          {PERKS.map((perk) => (
            <li
              key={perk}
              style={{ borderColor: theme.line, background: theme.surface, color: theme.ink }}
            >
              <span style={{ background: theme.secondary }} />
              {perk}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
