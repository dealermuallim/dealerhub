import type { KnownIncident } from './types';

/**
 * Seeded incident knowledge base.
 * Diagnosis only — never autonomously modify Oracle/VPD/ACLs/Render/tenants/domains.
 */
export const INCIDENT_CATALOG: readonly KnownIncident[] = [
  {
    id: 'INC-001',
    matchers: ['NJS-040', 'NJS-040:'],
    title: 'Oracle connection pool request timeout',
    rootCause:
      'Node-oracledb could not obtain a pooled connection before queueTimeout (pool exhausted, DB unreachable, or hung sessions).',
    provenSolution:
      'Check Oracle reachability and pool sizing (poolMax/queueTimeout). Clear stuck sessions. Restart the app process if the pool is wedged. Do not weaken VPD or security packages.',
    verification:
      'Retry a known-good DB call (e.g. public homepage for a mapped host). Confirm pool metrics recover and NJS-040 stops recurring.',
    publicSafeMessage: null,
  },
  {
    id: 'INC-002',
    matchers: ['ORA-20004', 'No active tenant for this domain'],
    title: 'No active tenant for hostname',
    rootCause:
      'TENANT_DOMAINS has no ACTIVE row for the request Host, or SET_PUBLIC_TENANT_BY_HOST rejected the domain. Fail closed — never fall back to another tenant.',
    provenSolution:
      'Verify TENANT_DOMAINS.DOMAIN_NAME (normalized), ACTIVE_YN=Y, and tenant ACTIVE_YN=Y for the intended dealership. Provision via DEALERHUB_PLATFORM_PKG only. Do not disable TRG_TSET_TENANT or VPD.',
    verification:
      "SET_PUBLIC_TENANT_BY_HOST('<host>') resolves the expected TENANT_ID; CLEAR_CONTEXT after; public homepage shows that dealer only.",
    publicSafeMessage:
      'Website temporarily unavailable. Please check the web address and try again.',
  },
  {
    id: 'INC-003',
    matchers: ['ORA-20501'],
    title: 'Oracle application security / authorization error',
    rootCause:
      'A DEALERHUB security or platform package raised ORA-20501 (caller not authorized or security precondition failed).',
    provenSolution:
      'Confirm the actor is in PLATFORM_ADMINS or has the required tenant membership. Fix membership/actor config — do not bypass DEALERHUB_SECURITY_PKG or fake context.',
    verification:
      'Retry the same operation with a valid platform/tenant actor. Unauthorized callers still receive ORA-20501.',
    publicSafeMessage: null,
  },
  {
    id: 'INC-004',
    matchers: ['ERESOLVE', 'npm ERR! ERESOLVE', 'Could not resolve dependency'],
    title: 'npm dependency resolution conflict',
    rootCause:
      'npm could not satisfy peer dependency constraints (ERESOLVE) during install or CI.',
    provenSolution:
      'Align peer versions in package.json / lockfile. Prefer a compatible dependency set over --force/--legacy-peer-deps unless explicitly approved. Re-run npm ci locally.',
    verification:
      'npm ci (or npm install) completes without ERESOLVE; lockfile committed if intentionally changed.',
    publicSafeMessage: null,
  },
] as const;

export const PUBLIC_UNAVAILABLE_MESSAGE =
  'Website temporarily unavailable. Please check the web address and try again.';
