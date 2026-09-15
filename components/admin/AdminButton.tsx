import Link from 'next/link';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  href?: string;
  children: React.ReactNode;
  variant?: Variant;
  small?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
};

const CLS: Record<Variant, string> = {
  primary: 'adm-btn adm-btn-primary',
  secondary: 'adm-btn adm-btn-secondary',
  ghost: 'adm-btn adm-btn-ghost',
  danger: 'adm-btn adm-btn-danger',
};

export default function AdminButton({
  href,
  children,
  variant = 'primary',
  small,
  type = 'button',
  onClick,
}: Props) {
  const className = `${CLS[variant]}${small ? ' adm-btn-sm' : ''}`;
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={className} onClick={onClick}>
      {children}
    </button>
  );
}
