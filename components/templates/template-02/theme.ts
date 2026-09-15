import type { PublicTenant } from '@/lib/tenant';

export type TemplateTheme = {
  primary: string;
  secondary: string;
  ink: string;
  muted: string;
  line: string;
  surface: string;
  soft: string;
};

export function getTemplateTheme(tenant: PublicTenant): TemplateTheme {
  return {
    primary: tenant.PRIMARY_COLOR || '#0f172a',
    secondary: tenant.SECONDARY_COLOR || '#16a34a',
    ink: '#0f172a',
    muted: '#64748b',
    line: '#e2e8f0',
    surface: '#ffffff',
    soft: '#f8fafc',
  };
}

export function money(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}
