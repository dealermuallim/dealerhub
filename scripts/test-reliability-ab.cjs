const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const ts = require('typescript');

const root = path.join(__dirname, '..');

function loadTs(rel) {
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  // strip type-only imports roughly by transpile
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: rel,
  }).outputText;
  const exports = {};
  const sandbox = {
    exports,
    module: { exports },
    require: (id) => {
      if (id === './types') return {};
      if (id === './catalog') return loadTs('lib/incidents/catalog.ts');
      if (id === './sanitize') return loadTs('lib/incidents/sanitize.ts');
      if (id === './diagnose') return loadTs('lib/incidents/diagnose.ts');
      return require(id);
    },
    console,
  };
  vm.runInNewContext(output, sandbox);
  return sandbox.module.exports;
}

const {
  diagnose,
  sanitizeErrorText,
  isUnresolvedPublicHostError,
  PUBLIC_UNAVAILABLE_MESSAGE,
  INCIDENT_CATALOG,
} = (() => {
  const catalog = loadTs('lib/incidents/catalog.ts');
  const sanitize = loadTs('lib/incidents/sanitize.ts');
  const diagnoseMod = (() => {
    const source = fs.readFileSync(path.join(root, 'lib/incidents/diagnose.ts'), 'utf8');
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const exports = {};
    const sandbox = {
      exports,
      module: { exports },
      require: (id) => {
        if (id === './catalog') return catalog;
        if (id === './sanitize') return sanitize;
        if (id === './types') return {};
        return require(id);
      },
      console,
    };
    vm.runInNewContext(output, sandbox);
    return sandbox.module.exports;
  })();
  return {
    ...diagnoseMod,
    sanitizeErrorText: sanitize.sanitizeErrorText,
    PUBLIC_UNAVAILABLE_MESSAGE: catalog.PUBLIC_UNAVAILABLE_MESSAGE,
    INCIDENT_CATALOG: catalog.INCIDENT_CATALOG,
  };
})();

assert.ok(INCIDENT_CATALOG.length >= 4);
assert.equal(
  PUBLIC_UNAVAILABLE_MESSAGE,
  'Website temporarily unavailable. Please check the web address and try again.'
);

assert.equal(diagnose(new Error('NJS-040: connection request timeout')).incidentId, 'INC-001');
assert.equal(diagnose('ORA-20004: No active tenant for this domain').incidentId, 'INC-002');
assert.equal(diagnose(new Error('ORA-20501: not authorized')).incidentId, 'INC-003');
assert.equal(diagnose('npm ERR! ERESOLVE could not resolve').incidentId, 'INC-004');
assert.equal(diagnose(new Error('something totally novel XYZ-999')).incidentId, 'UNKNOWN');

assert.equal(isUnresolvedPublicHostError('ORA-20004 boom'), true);
assert.equal(isUnresolvedPublicHostError('NJS-040'), false);

const dirty = sanitizeErrorText(
  'ORA-20004 password=supersecret ORACLE_PASSWORD=abc Bearer eyJhbGciOiJIUzI1NiJ9.aaa.bbb connectString=dbhost:1521/x'
);
assert.ok(!dirty.includes('supersecret'));
assert.ok(!dirty.includes('abc'));
assert.ok(dirty.includes('[REDACTED]'));
assert.ok(!/eyJhbGci/.test(dirty));

const r2 = diagnose('ORA-20004');
assert.equal(r2.autoRepairForbidden, true);
assert.equal(r2.publicSafeMessage, PUBLIC_UNAVAILABLE_MESSAGE);
assert.ok(r2.provenSolution.includes('TENANT_DOMAINS'));
assert.ok(!/Shelby|Silk Road/i.test(r2.publicSafeMessage));

// UI component must stay neutral
const ui = fs.readFileSync(path.join(root, 'components/public/WebsiteUnavailable.tsx'), 'utf8');
assert.ok(ui.includes('PUBLIC_UNAVAILABLE_MESSAGE'));
assert.ok(!/Shelby|Silk Road|ORA-|TENANT_/i.test(ui));

const home = fs.readFileSync(path.join(root, 'app/page.tsx'), 'utf8');
assert.ok(home.includes('WebsiteUnavailable'));
assert.ok(!/No active dealership|configured for this domain/i.test(home));

const inv = fs.readFileSync(path.join(root, 'app/inventory/page.tsx'), 'utf8');
assert.ok(inv.includes('WebsiteUnavailable'));
assert.ok(!/No dealership is configured for \{host\}/.test(inv));

const veh = fs.readFileSync(path.join(root, 'app/vehicle/[vehicleId]/page.tsx'), 'utf8');
assert.ok(veh.includes('WebsiteUnavailable'));

const tenantSrc = fs.readFileSync(path.join(root, 'lib/tenant.ts'), 'utf8');
assert.ok(tenantSrc.includes('isUnresolvedPublicHostError'));
assert.ok(tenantSrc.includes('CLEAR_CONTEXT'));
assert.ok(tenantSrc.includes('return null'));

console.log('PASS: incident seeds, UNKNOWN, sanitize, public copy, page wiring, tenant fail-closed.');
