'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/inventory/new', label: 'Add Vehicle' },
  { href: '/admin/tenants', label: 'Tenants' },
  { href: '/admin/settings', label: 'Website Settings' },
  { href: '/', label: 'View Public Website' },
] as const;

type Props = { open?: boolean };

export default function Sidebar({ open }: Props) {
  const pathname = usePathname();

  return (
    <aside className={`adm-sidebar${open ? ' open' : ''}`}>
      <div className="adm-brand">
        <strong>DealerHub Admin</strong>
        <span>Multi-tenant control</span>
      </div>
      <nav className="adm-nav" aria-label="Admin">
        {LINKS.map((item) => {
          let isActive = false;
          if (item.href === '/admin') isActive = pathname === '/admin';
          else if (item.href === '/admin/inventory/new') isActive = pathname === '/admin/inventory/new';
          else if (item.href === '/admin/inventory') {
            isActive =
              pathname === '/admin/inventory' ||
              (pathname.startsWith('/admin/inventory/') && pathname !== '/admin/inventory/new');
          } else if (item.href === '/') isActive = false;
          else isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link key={item.href} href={item.href} className={isActive ? 'active' : undefined}>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <form action="/api/admin/logout" method="post" className="adm-logout">
        <button type="submit" className="adm-btn adm-btn-ghost adm-btn-sm">
          Logout
        </button>
      </form>
    </aside>
  );
}
