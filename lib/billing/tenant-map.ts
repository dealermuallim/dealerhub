import type { AdminSession } from '@/lib/admin-auth';

/**
 * Server-side tenant mapping for dealer sessions.
 * Never trust browser TENANT_ID.
 */
export function resolveDealerTenantId(
  session: AdminSession | null | undefined
): number | null {
  if (!session || session.role !== 'dealer_admin') return null;

  const mapRaw = process.env.BILLING_TENANT_BY_EMAIL;
  if (mapRaw) {
    try {
      const map = JSON.parse(mapRaw) as Record<string, number>;
      const hit = map[session.email.toLowerCase()];
      if (Number.isInteger(hit) && hit > 0) return hit;
    } catch {
      /* ignore bad map */
    }
  }

  const single = Number(process.env.DEALER_ADMIN_TENANT_ID || '');
  if (Number.isInteger(single) && single > 0) return single;
  return null;
}
