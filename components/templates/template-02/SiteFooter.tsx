import Link from 'next/link';
import type { PublicTenant } from '@/lib/tenant';
import type { TemplateTheme } from './theme';

type Props = {
  tenant: PublicTenant;
  theme: TemplateTheme;
};

export default function SiteFooter({ tenant, theme }: Props) {
  const title = tenant.WEBSITE_TITLE || tenant.DEALER_NAME;
  const location = [tenant.CITY, tenant.STATE_CODE].filter(Boolean).join(', ');

  return (
    <footer className="t02-footer" style={{ background: theme.primary }}>
      <div className="t02-wrap t02-footer-grid">
        <div>
          <strong>{title}</strong>
          <p>{tenant.DEALER_NAME}</p>
          {location ? <p>{location}</p> : null}
          {tenant.PHONE ? <p>{tenant.PHONE}</p> : null}
          {tenant.EMAIL ? <p>{tenant.EMAIL}</p> : null}
        </div>

        <div>
          <h4>Explore</h4>
          <Link href="/inventory">Inventory</Link>
          <a href="#financing">Financing</a>
          <a href="#sell-trade">Trade-In</a>
          <a href="#find-it">Contact</a>
        </div>

        <div>
          <h4>Hours</h4>
          <p>Mon–Sat: 9:00 AM – 7:00 PM</p>
          <p>Sun: Closed</p>
          <p className="t02-footer-note">Confirm hours when you visit.</p>
        </div>

        <div>
          <h4>Legal</h4>
          <a href="#privacy">Privacy</a>
          <p className="t02-footer-note">
            © {new Date().getFullYear()} {tenant.DEALER_NAME}
          </p>
        </div>
      </div>
    </footer>
  );
}
