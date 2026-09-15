'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './admin.css';

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export default function AdminShell({ title, subtitle, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="adm-root">
      <div
        className={`adm-backdrop${open ? ' open' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />
      <div className="adm-shell">
        <Sidebar open={open} />
        <div className="adm-main">
          <Topbar
            title={title}
            subtitle={subtitle}
            onMenu={() => setOpen((v) => !v)}
          />
          <div className="adm-content">{children}</div>
        </div>
      </div>
    </div>
  );
}
