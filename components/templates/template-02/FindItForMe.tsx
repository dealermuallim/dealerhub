import { BODY_STYLES } from './demo-inventory';
import type { TemplateTheme } from './theme';

type Props = { theme: TemplateTheme };

export default function FindItForMe({ theme }: Props) {
  return (
    <section
      className="t02-section t02-section-soft"
      id="find-it"
      style={{ background: theme.soft }}
    >
      <div className="t02-wrap t02-two-col">
        <div>
          <p className="t02-kicker" style={{ color: theme.secondary }}>
            Concierge request
          </p>
          <h2 style={{ color: theme.ink }}>Find It For Me</h2>
          <p style={{ color: theme.muted, fontSize: 18, lineHeight: 1.6 }}>
            Don&apos;t see the car you want? Tell us what you&apos;re looking for.
            We&apos;ll help match you with the right vehicle.
          </p>
        </div>

        <form
          className="t02-panel-form"
          style={{ background: theme.surface, borderColor: theme.line }}
          action="#find-it"
          method="get"
        >
          <div className="t02-form-grid">
            <label>
              <span>Make</span>
              <input name="make" placeholder="e.g. Honda" />
            </label>
            <label>
              <span>Model</span>
              <input name="model" placeholder="e.g. Accord" />
            </label>
            <label>
              <span>Year</span>
              <input name="year" placeholder="e.g. 2020+" />
            </label>
            <label>
              <span>Max mileage</span>
              <input name="maxMileage" placeholder="e.g. 80000" />
            </label>
            <label>
              <span>Max budget</span>
              <input name="maxBudget" placeholder="e.g. 20000" />
            </label>
            <label>
              <span>Body style</span>
              <select name="bodyStyle" defaultValue="">
                <option value="">Any</option>
                {BODY_STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="submit"
            className="t02-btn"
            style={{ background: theme.secondary, color: '#fff' }}
          >
            Submit request
          </button>
          <p className="t02-form-note" style={{ color: theme.muted }}>
            Presentation-only form — connect to a lead API later.
          </p>
        </form>
      </div>
    </section>
  );
}
