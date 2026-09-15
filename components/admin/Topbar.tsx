'use client';

type Props = {
  title: string;
  subtitle?: string;
  onMenu?: () => void;
};

export default function Topbar({ title, subtitle, onMenu }: Props) {
  return (
    <header className="adm-topbar">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <button type="button" className="adm-mobile-toggle" onClick={onMenu}>
        Menu
      </button>
    </header>
  );
}
