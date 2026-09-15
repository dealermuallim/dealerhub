const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const crypto = require('crypto');

const root = path.join(__dirname, '..');

function transpileLoad(rel, requireMap = {}) {
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const sandbox = {
    exports: module.exports,
    module,
    require: (id) => {
      if (requireMap[id]) return requireMap[id];
      if (id.startsWith('./') || id.startsWith('@/')) {
        throw new Error('unmapped ' + id + ' from ' + rel);
      }
      return require(id);
    },
    console,
    process,
    Buffer,
    TextEncoder,
    TextDecoder,
    crypto: globalThis.crypto,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(output, sandbox, { filename: rel });
  return module.exports;
}

const storePath = path.join(root, '.data', 'incidents-store.test.json');
process.env.DEALERHUB_INCIDENT_STORE = storePath;
try { fs.unlinkSync(storePath); } catch {}

const sanitize = transpileLoad('lib/incidents/sanitize.ts');
const catalog = transpileLoad('lib/incidents/catalog.ts');
const diagnose = transpileLoad('lib/incidents/diagnose.ts', {
  './catalog': catalog,
  './sanitize': sanitize,
  './types': {},
});
const fingerprint = transpileLoad('lib/incidents/fingerprint.ts', {
  './sanitize': sanitize,
  crypto,
});
const runbooks = transpileLoad('lib/incidents/runbooks.ts', { './types': {} });
const patchMemory = transpileLoad('lib/incidents/patch-memory.ts', {
  './runbooks': runbooks,
  './model': {},
});

// store needs many deps — load with maps
const store = transpileLoad('lib/incidents/store.ts', {
  './diagnose': diagnose,
  './fingerprint': fingerprint,
  './model': {},
  './patch-memory': patchMemory,
  './runbooks': runbooks,
  './sanitize': sanitize,
  './types': {},
  crypto,
  fs,
  path,
});

store.resetIncidentStoreForTests();

// INC match + UNKNOWN
assert.equal(diagnose.diagnose('ORA-20004').incidentId, 'INC-002');
assert.equal(diagnose.diagnose('weird-zz').incidentId, 'UNKNOWN');

// sanitize common secrets
const dirty = sanitize.sanitizeErrorText(
  'fail password=secret123 ORACLE_PASSWORD=p Bearer eyJhbGciOiJIUzI1NiJ9.aaa.bbb sk_live_abc AKIAIOSFODNN7EXAMPLE xoxb-123-456 postgres://u:p@h/db'
);
assert.ok(!dirty.includes('secret123'));
assert.ok(!dirty.includes('sk_live_abc'));
assert.ok(!/AKIAIOSFODNN7EXAMPLE/.test(dirty));
assert.ok(dirty.includes('[REDACTED]') || !dirty.includes('postgres://u:p'));

// dedup occurrence count
const a = store.recordIncidentOccurrence({ error: 'ORA-20004: No active tenant for this domain', host: 'x.example', now: new Date('2026-09-15T15:00:00Z') });
const b = store.recordIncidentOccurrence({ error: 'ORA-20004 again', host: 'x.example', now: new Date('2026-09-15T15:05:00Z') });
assert.equal(a.incident.incidentId, 'INC-002');
assert.equal(b.incident.occurrenceCount, 2);
assert.equal(a.isNew, true);
assert.equal(b.isNew, false);
assert.equal(b.incident.firstSeenAt, '2026-09-15T15:00:00.000Z');
assert.equal(b.incident.lastSeenAt, '2026-09-15T15:05:00.000Z');

// patch memory refs
const pm = patchMemory.knownIncidentPatchDefaults('INC-002');
assert.equal(pm.autoExecuteAuthorized, false);
assert.ok(pm.dbObjectRef);
assert.ok(pm.rollbackRef);
assert.ok(runbooks.runbookRefFor('INC-002').includes('INC-002'));

// evidence + durations (only when provided — not invented)
const updated = store.attachEvidence({
  incidentId: 'INC-002',
  beforeRef: 'evidence/before-ora20004.txt',
  afterRef: 'evidence/after-ora20004.txt',
  diagnosisDurationMs: 1200,
  repairDurationMs: 5000,
  gitSha: 'fc9c5b22a85c4ebdca92db31b4579c39d416e0d9',
  files: ['lib/tenant.ts'],
  implementedBy: 'BUILDER GROK',
  status: 'INVESTIGATING',
});
assert.equal(updated.totalDurationMs, 6200);
assert.equal(updated.verifiedBy, null);
assert.equal(updated.qaResult, null);
assert.equal(updated.autoRepairForbidden, true);

// platform auth helpers
process.env.ADMIN_EMAIL = 'platform@example.com';
process.env.ADMIN_PASSWORD = 'platform-pass';
process.env.PLATFORM_ADMIN_EMAIL = 'platform@example.com';
process.env.PLATFORM_ADMIN_PASSWORD = 'platform-pass';
process.env.DEALER_ADMIN_EMAIL = 'dealer@example.com';
process.env.DEALER_ADMIN_PASSWORD = 'dealer-pass';
process.env.ADMIN_SESSION_SECRET = '1234567890abcdef';

const auth = transpileLoad('lib/admin-auth.ts', { crypto });
(async () => {
  const pre = await auth.resolveAdminRoleForCredentials('platform@example.com', 'platform-pass');
  const dre = await auth.resolveAdminRoleForCredentials('dealer@example.com', 'dealer-pass');
  assert.equal(pre, 'platform_admin');
  assert.equal(dre, 'dealer_admin');

  const pToken = await auth.createAdminSession({ email: 'platform@example.com', role: 'platform_admin' });
  const dToken = await auth.createAdminSession({ email: 'dealer@example.com', role: 'dealer_admin' });
  const pSess = await auth.parseAndVerifySessionToken(pToken);
  const dSess = await auth.parseAndVerifySessionToken(dToken);
  assert.equal(auth.isPlatformAdminSession(pSess), true);
  assert.equal(auth.isPlatformAdminSession(dSess), false);

  // UI must not expose AUTO FIX buttons
  const ui = fs.readFileSync(path.join(root, 'app/admin/system-health/SystemHealthClient.tsx'), 'utf8');
  assert.ok(ui.includes('Run Diagnostics'));
  assert.ok(ui.includes('Refresh'));
  assert.ok(!ui.includes('AUTO FIX'));
  assert.ok(ui.includes('AUTO REPAIR FORBIDDEN'));
  assert.ok(!/\bRESTART\b/.test(ui));
  assert.ok(!ui.includes('Change ACL'));
  assert.ok(!ui.includes('Deploy Now'));

  const sql = fs.readFileSync(path.join(root, 'sql/migrations/20260915_01_incident_knowledge_v1.sql'), 'utf8');
  assert.ok(sql.includes('DH_INCIDENTS'));
  assert.ok(sql.includes('DH_INCIDENT_OCCURRENCES'));
  assert.ok(sql.includes('AUTO_REPAIR_FORBIDDEN'));

  // public unavailable still present
  const home = fs.readFileSync(path.join(root, 'app/page.tsx'), 'utf8');
  assert.ok(home.includes('WebsiteUnavailable'));

  console.log('PASS: V1 unit — match, UNKNOWN, sanitize, dedup, patch refs, evidence durations, platform vs dealer auth, read-only UI, migration present.');
})().catch((e) => { console.error(e); process.exit(1); });
