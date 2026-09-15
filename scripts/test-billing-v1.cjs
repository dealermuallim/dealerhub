const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const crypto = require('crypto');

const root = 'C:/akn-dealer-portal';
process.env.DEALERHUB_BILLING_STORE = path.join(root, '.data', 'billing-store.test.json');
process.env.DEALERHUB_INCIDENT_STORE = path.join(root, '.data', 'incidents-store.billing-test.json');
process.env.BILLING_PROVIDER = 'mock';
process.env.DEALER_ADMIN_TENANT_ID = '62';
process.env.BILLING_LATE_FEE_ENABLED = 'true';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock_dealerhub';

try { fs.unlinkSync(process.env.DEALERHUB_BILLING_STORE); } catch {}
try { fs.unlinkSync(process.env.DEALERHUB_INCIDENT_STORE); } catch {}

function load(rel, map = {}) {
  const abs = path.join(root, rel);
  const source = fs.readFileSync(abs, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const sandbox = {
    exports: module.exports,
    module,
    require: (id) => {
      if (map[id]) return map[id];
      if (id === '@/lib/incidents/sanitize') return load('lib/incidents/sanitize.ts');
      if (id === 'crypto') return crypto;
      if (id === 'fs') return fs;
      if (id === 'path') return path;
      if (id.startsWith('./') || id.startsWith('../')) {
        const resolved = path.normalize(path.join(path.dirname(abs), id));
        const candidates = [resolved, resolved + '.ts', path.join(resolved, 'index.ts')];
        for (const c of candidates) {
          if (fs.existsSync(c) && fs.statSync(c).isFile()) {
            return load(path.relative(root, c).replace(/\\/g, '/'), map);
          }
        }
      }
      return require(id);
    },
    console,
    process,
    Buffer,
    TextEncoder,
    TextDecoder,
    URL,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(output, sandbox, { filename: rel });
  return module.exports;
}

const incidentSanitize = load('lib/incidents/sanitize.ts');
const catalog = load('lib/incidents/catalog.ts');
const diagnose = load('lib/incidents/diagnose.ts', {
  './catalog': catalog,
  './sanitize': incidentSanitize,
  './types': {},
});
const fingerprint = load('lib/incidents/fingerprint.ts', { './sanitize': incidentSanitize, crypto });
const incidentStore = load('lib/incidents/store.ts', {
  './diagnose': diagnose,
  './fingerprint': fingerprint,
  './model': {},
  './patch-memory': { knownIncidentPatchDefaults: () => null },
  './runbooks': { runbookRefFor: () => null },
  './sanitize': incidentSanitize,
  './types': {},
  crypto,
  fs,
  path,
});

const sm = load('lib/billing/state-machine.ts');
const billingStore = load('lib/billing/store.ts', { crypto, fs, path });
const enforcement = load('lib/billing/enforcement.ts', {
  '@/lib/admin-auth': {
    isPlatformAdminSession: (s) => !!(s && s.role === 'platform_admin'),
  },
});
const mockProv = load('lib/billing/providers/mock.ts', { crypto });
const sanitizeBilling = load('lib/billing/sanitize.ts', {
  '@/lib/incidents/sanitize': incidentSanitize,
});

// provider-factory used by webhooks
const providerFactory = {
  getBillingProvider: () => mockProv.createMockBillingProvider(),
};
const webhooks = load('lib/billing/webhooks.ts', {
  '@/lib/incidents/store': incidentStore,
  './provider-factory': providerFactory,
});

(async () => {
  billingStore.resetBillingStoreForTests();

  const acct = billingStore.ensureBillingAccount(62, 'dealer@example.com');
  assert.equal(acct.status, 'TRIAL');
  billingStore.transitionBillingStatus({
    tenantId: 62,
    to: 'ACTIVE',
    actor: 'test',
    detail: 'activate',
    periodStart: '2026-09-01T00:00:00Z',
    periodEnd: '2026-10-01T00:00:00Z',
    providerCustomerId: 'cus_mock_62',
  });
  assert.equal(billingStore.getBillingAccountByTenant(62).status, 'ACTIVE');
  billingStore.transitionBillingStatus({ tenantId: 62, to: 'PAST_DUE', actor: 'test', detail: 'fail' });
  billingStore.enterGraceIfNeeded(62, 'test');
  assert.equal(billingStore.getBillingAccountByTenant(62).status, 'GRACE');
  billingStore.transitionBillingStatus({ tenantId: 62, to: 'SUSPENDED', actor: 'test', detail: 'suspend' });
  assert.equal(billingStore.getBillingAccountByTenant(62).status, 'SUSPENDED');

  const platform = { email: 'platform@example.com', role: 'platform_admin' };
  const dealer = { email: 'dealer@example.com', role: 'dealer_admin' };
  assert.equal(
    enforcement.evaluateDealerBillingGate({ session: platform, pathname: '/api/v1/vehicles', isApi: true }).allow,
    true
  );
  const blocked = enforcement.evaluateDealerBillingGate({
    session: dealer,
    pathname: '/api/v1/vehicles',
    isApi: true,
  });
  assert.equal(blocked.allow, false);
  assert.equal(blocked.statusCode, 402);
  assert.equal(
    enforcement.evaluateDealerBillingGate({
      session: dealer,
      pathname: '/admin/account/billing',
      isApi: false,
    }).allow,
    true
  );

  const a1 = billingStore.applyLateFeeIfAllowed({
    tenantId: 62,
    billingAccountId: acct.billingAccountId,
    cycleKey: '2026-09',
  });
  const a2 = billingStore.applyLateFeeIfAllowed({
    tenantId: 62,
    billingAccountId: acct.billingAccountId,
    cycleKey: '2026-09',
  });
  assert.equal(a1.applied, true);
  assert.equal(a2.applied, false);

  const bad = await webhooks.processBillingWebhook({
    rawBody: '{"id":"evt_1","type":"invoice.paid"}',
    signature: 'bad',
  });
  assert.equal(bad.status, 400);

  const payload = JSON.stringify({
    id: 'evt_paid_1',
    type: 'invoice.payment_succeeded',
    created: 1,
    data: {
      object: {
        customer: 'cus_mock_62',
        status: 'paid',
        metadata: { tenant_id: '999' },
        current_period_start: 1690000000,
        current_period_end: 1693000000,
      },
    },
  });
  const sig = mockProv.signMockWebhook(payload);
  const paid = await webhooks.processBillingWebhook({ rawBody: payload, signature: sig });
  assert.equal(paid.status, 200);
  assert.equal(billingStore.getBillingAccountByTenant(62).status, 'ACTIVE');
  // forged metadata tenant 999 must not win over customer map
  assert.equal(billingStore.getBillingAccountByTenant(999), null);

  const dup = await webhooks.processBillingWebhook({ rawBody: payload, signature: sig });
  assert.equal(dup.body.duplicate, true);

  billingStore.transitionBillingStatus({ tenantId: 62, to: 'SUSPENDED', actor: 't', detail: 'ach' });
  const achPayload = JSON.stringify({
    id: 'evt_ach_pending',
    type: 'payment_intent.processing',
    created: 2,
    data: {
      object: {
        customer: 'cus_mock_62',
        status: 'processing',
        metadata: { tenant_id: '62' },
      },
    },
  });
  await webhooks.processBillingWebhook({
    rawBody: achPayload,
    signature: mockProv.signMockWebhook(achPayload),
  });
  assert.equal(billingStore.getBillingAccountByTenant(62).status, 'SUSPENDED');

  billingStore.ensureBillingAccount(21);
  billingStore.transitionBillingStatus({
    tenantId: 21,
    to: 'ACTIVE',
    actor: 't',
    detail: 'shelby',
    providerCustomerId: 'cus_mock_21',
  });
  assert.equal(billingStore.getBillingAccountByTenant(21).status, 'ACTIVE');
  assert.equal(billingStore.getBillingAccountByTenant(62).tenantId, 62);

  assert.equal(diagnose.diagnose('STRIPE_WEBHOOK_SIGNATURE_FAILURE').incidentId, 'INC-005');
  assert.equal(diagnose.diagnose('ACCOUNT_REACTIVATION_FAILURE').incidentId, 'INC-009');
  assert.ok(!sanitizeBilling.sanitizeBillingText('sk_test_abc whsec_zzz').includes('sk_test_abc'));
  assert.ok(sm.canTransition('TRIAL', 'ACTIVE'));
  assert.ok(!sm.canTransition('SUSPENDED', 'PAST_DUE'));
  assert.ok(!sm.isAdminAccessBlocked('ACTIVE'));
  assert.ok(sm.isAdminAccessBlocked('SUSPENDED'));

  billingStore.transitionBillingStatus({ tenantId: 62, to: 'CANCELED', actor: 't', detail: 'cancel' });
  assert.equal(billingStore.getBillingAccountByTenant(62).status, 'CANCELED');
  billingStore.transitionBillingStatus({ tenantId: 62, to: 'MANUAL_HOLD', actor: 't', detail: 'hold' });
  assert.equal(billingStore.getBillingAccountByTenant(62).status, 'MANUAL_HOLD');

  console.log('PASS: billing states, platform/dealer gate, late-fee idempotency, webhook sig/dedupe/ACH/reactivate, tenant isolation, sanitize, incidents.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
