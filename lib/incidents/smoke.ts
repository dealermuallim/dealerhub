import { getPublicTenantByHost } from '@/lib/tenant';
import { getPublicVehiclesByHost } from '@/lib/vehicles';
import { getOracleConnection } from '@/lib/db';

export type SmokeResult = {
  id: string;
  label: string;
  result: 'PASS' | 'FAIL';
  detail: string;
};

/**
 * Lightweight post-deploy smoke foundation.
 * Read-only — no data mutation, no tenant/domain writes.
 */
export async function runPostDeploySmoke(opts?: {
  primaryHost?: string;
  isolationHost?: string;
}): Promise<SmokeResult[]> {
  const primary =
    opts?.primaryHost ||
    process.env.SMOKE_PRIMARY_HOST ||
    'dealerhub-k1fc.onrender.com';
  const isolation =
    opts?.isolationHost || process.env.SMOKE_ISOLATION_HOST || 'localhost';

  const results: SmokeResult[] = [];

  results.push({
    id: 'app',
    label: 'APP',
    result: 'PASS',
    detail: 'Process alive',
  });

  try {
    const c = await getOracleConnection();
    try {
      await c.execute('SELECT 1 FROM DUAL');
      results.push({
        id: 'oracle',
        label: 'ORACLE',
        result: 'PASS',
        detail: 'Read probe ok',
      });
    } finally {
      try {
        await c.execute(
          `BEGIN DEALERHUB_SECURITY_PKG.CLEAR_CONTEXT; END;`
        );
      } catch {
        /* ignore */
      }
      await c.close();
    }
  } catch {
    results.push({
      id: 'oracle',
      label: 'ORACLE',
      result: 'FAIL',
      detail: 'Read probe failed',
    });
  }

  try {
    const t = await getPublicTenantByHost(primary);
    results.push({
      id: 'tenant_resolution',
      label: 'TENANT RESOLUTION',
      result: t ? 'PASS' : 'FAIL',
      detail: t ? 'Primary host resolved' : 'Primary host unresolved',
    });
    results.push({
      id: 'public_homepage',
      label: 'PUBLIC HOMEPAGE',
      result: t ? 'PASS' : 'FAIL',
      detail: t ? 'Tenant available for homepage render' : 'No tenant for homepage',
    });
  } catch {
    results.push({
      id: 'tenant_resolution',
      label: 'TENANT RESOLUTION',
      result: 'FAIL',
      detail: 'Threw',
    });
    results.push({
      id: 'public_homepage',
      label: 'PUBLIC HOMEPAGE',
      result: 'FAIL',
      detail: 'Threw',
    });
  }

  try {
    await getPublicVehiclesByHost(primary, {});
    results.push({
      id: 'inventory',
      label: 'INVENTORY',
      result: 'PASS',
      detail: 'Public inventory read ok (no mutation)',
    });
  } catch {
    results.push({
      id: 'inventory',
      label: 'INVENTORY',
      result: 'FAIL',
      detail: 'Public inventory read failed',
    });
  }

  try {
    const a = await getPublicTenantByHost(primary);
    const b = await getPublicTenantByHost(isolation);
    const distinct =
      Boolean(a && b) && a!.TENANT_ID !== b!.TENANT_ID;
    results.push({
      id: 'tenant_isolation',
      label: 'TENANT ISOLATION',
      result: distinct ? 'PASS' : 'FAIL',
      detail:
        a && b
          ? `Hosts map to tenantIds ${a.TENANT_ID} vs ${b.TENANT_ID} (no cross-leak check beyond distinct resolve)`
          : 'One or both hosts unresolved',
    });
  } catch {
    results.push({
      id: 'tenant_isolation',
      label: 'TENANT ISOLATION',
      result: 'FAIL',
      detail: 'Isolation probe threw',
    });
  }

  return results;
}
