import { getOracleConnection } from '@/lib/db';
import { getPublicTenantByHost } from '@/lib/tenant';

import { getDeployInfo } from './deploy-info';

export type HealthState = 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';

export type HealthCheckResult = {
  id: string;
  label: string;
  state: HealthState;
  detail: string;
  checkedAt: string;
};

function hasCloudinary(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function hasVinDecoder(): boolean {
  return Boolean(
    process.env.DECODETHIS_API_KEY ||
      process.env.VIN_API_KEY ||
      process.env.DECODE_THIS_API_KEY
  );
}

/** Cheap, non-spammy health probes — no continuous third-party polling loops. */
export async function runHealthChecks(opts?: {
  publicHost?: string | null;
}): Promise<{
  checks: HealthCheckResult[];
  overall: HealthState;
  deploy: ReturnType<typeof getDeployInfo>;
}> {
  const checkedAt = new Date().toISOString();
  const checks: HealthCheckResult[] = [];

  checks.push({
    id: 'app',
    label: 'App',
    state: 'HEALTHY',
    detail: 'Next.js process responding',
    checkedAt,
  });

  // Oracle
  try {
    const conn = await getOracleConnection();
    try {
      await conn.execute('SELECT 1 AS OK FROM DUAL');
      checks.push({
        id: 'oracle',
        label: 'Oracle',
        state: 'HEALTHY',
        detail: 'SELECT 1 succeeded',
        checkedAt,
      });
    } finally {
      try {
        await conn.execute(
          `BEGIN DEALERHUB_SECURITY_PKG.CLEAR_CONTEXT; END;`
        );
      } catch {
        /* ignore */
      }
      await conn.close();
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    checks.push({
      id: 'oracle',
      label: 'Oracle',
      state: /NJS-040|timeout|DPI/i.test(msg) ? 'DOWN' : 'DOWN',
      detail: 'Oracle check failed (sanitized)',
      checkedAt,
    });
  }

  // Tenant resolution (uses known local/dev host when provided)
  const host = opts?.publicHost || process.env.HEALTHCHECK_PUBLIC_HOST || 'localhost';
  try {
    const tenant = await getPublicTenantByHost(host);
    checks.push({
      id: 'tenant_resolution',
      label: 'Tenant Resolution',
      state: tenant ? 'HEALTHY' : 'DEGRADED',
      detail: tenant
        ? 'Host resolved to an active tenant'
        : 'Host unresolved (fail-closed)',
      checkedAt,
    });
  } catch {
    checks.push({
      id: 'tenant_resolution',
      label: 'Tenant Resolution',
      state: 'DOWN',
      detail: 'Tenant resolution threw',
      checkedAt,
    });
  }

  checks.push({
    id: 'image_storage',
    label: 'Image Storage',
    state: hasCloudinary() ? 'HEALTHY' : 'UNKNOWN',
    detail: hasCloudinary()
      ? 'Cloudinary env present'
      : 'Cloudinary env not configured',
    checkedAt,
  });

  checks.push({
    id: 'vin_decoder',
    label: 'VIN Decoder',
    state: hasVinDecoder() ? 'HEALTHY' : 'UNKNOWN',
    detail: hasVinDecoder()
      ? 'VIN decoder key present'
      : 'VIN decoder key not configured (no live probe)',
    checkedAt,
  });

  checks.push({
    id: 'public_website',
    label: 'Public Website',
    state:
      checks.find((c) => c.id === 'tenant_resolution')?.state === 'HEALTHY'
        ? 'HEALTHY'
        : checks.find((c) => c.id === 'tenant_resolution')?.state === 'DEGRADED'
          ? 'DEGRADED'
          : 'UNKNOWN',
    detail: 'Derived from tenant resolution (no external spam)',
    checkedAt,
  });


  const order: HealthState[] = ['DOWN', 'DEGRADED', 'UNKNOWN', 'HEALTHY'];
  let overall: HealthState = 'HEALTHY';
  for (const s of order) {
    if (checks.some((c) => c.state === s)) {
      overall = s;
      break;
    }
  }

  return { checks, overall, deploy: getDeployInfo() };
}
