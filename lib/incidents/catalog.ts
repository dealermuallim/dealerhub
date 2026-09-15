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
  {
    id: 'INC-005',
    matchers: ['STRIPE_WEBHOOK_SIGNATURE_FAILURE'],
    title: 'Stripe webhook signature failure',
    rootCause: 'Webhook signature missing/invalid or raw body mismatched.',
    provenSolution: 'Verify STRIPE_WEBHOOK_SECRET and that the handler reads the raw body before parsing.',
    verification: 'Valid signed test event returns 200; forged signature returns 400.',
    publicSafeMessage: null,
  },
  {
    id: 'INC-006',
    matchers: ['STRIPE_PROVIDER_UNAVAILABLE'],
    title: 'Stripe provider unavailable',
    rootCause: 'Stripe secret missing or Stripe API unreachable.',
    provenSolution: 'Restore STRIPE_SECRET_KEY / network; use mock provider only in non-prod.',
    verification: 'Provider factory returns stripe when key present; checkout session creates.',
    publicSafeMessage: null,
  },
  {
    id: 'INC-007',
    matchers: ['BILLING_STATE_MISMATCH'],
    title: 'Billing state machine mismatch',
    rootCause: 'Illegal billing status transition attempted.',
    provenSolution: 'Inspect audit trail; repair via approved transition only — never TENANTS.ACTIVE_YN.',
    verification: 'Illegal transition throws; legal path audited.',
    publicSafeMessage: null,
  },
  {
    id: 'INC-008',
    matchers: ['DUPLICATE_PAYMENT_EVENT'],
    title: 'Duplicate payment webhook event',
    rootCause: 'Provider retried an event already stored by PROVIDER_EVENT_ID.',
    provenSolution: 'Idempotent no-op is correct; confirm unique constraint / store dedupe.',
    verification: 'Replayed event returns duplicate=true without double transition.',
    publicSafeMessage: null,
  },
  {
    id: 'INC-009',
    matchers: ['ACCOUNT_REACTIVATION_FAILURE'],
    title: 'Account reactivation failure',
    rootCause: 'Settled payment event could not transition account to ACTIVE.',
    provenSolution: 'Check state machine + tenant mapping; manual platform review; do not auto-weaken security.',
    verification: 'After fix, settled event activates once; audit recorded.',
    publicSafeMessage: null,
  },
] as const;

export const PUBLIC_UNAVAILABLE_MESSAGE =
  'Website temporarily unavailable. Please check the web address and try again.';
