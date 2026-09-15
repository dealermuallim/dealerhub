const fs = require('fs');
const path = require('path');
const oracledb = require('oracledb');
const ts = require('typescript');
const vm = require('vm');

const root = 'C:/akn-dealer-portal';
const e = {};
for (const l of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  if (!l || l.startsWith('#') || !l.includes('=')) continue;
  const i = l.indexOf('=');
  e[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}

// Load diagnose for logging
function loadDiagnose() {
  const catalogSrc = fs.readFileSync(path.join(root, 'lib/incidents/catalog.ts'), 'utf8');
  const sanitizeSrc = fs.readFileSync(path.join(root, 'lib/incidents/sanitize.ts'), 'utf8');
  const diagnoseSrc = fs.readFileSync(path.join(root, 'lib/incidents/diagnose.ts'), 'utf8');
  const catalog = {};
  vm.runInNewContext(ts.transpileModule(catalogSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: catalog, module: { exports: catalog }, require });
  const sanitize = {};
  vm.runInNewContext(ts.transpileModule(sanitizeSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: sanitize, module: { exports: sanitize }, require });
  const diagnose = {};
  vm.runInNewContext(ts.transpileModule(diagnoseSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports: diagnose,
    module: { exports: diagnose },
    require: (id) => (id === './catalog' ? catalog : id === './sanitize' ? sanitize : id === './types' ? {} : require(id)),
  });
  return { ...diagnose, ...catalog, ...sanitize };
}
const { diagnose, isUnresolvedPublicHostError, PUBLIC_UNAVAILABLE_MESSAGE } = loadDiagnose();

async function resolveHost(host) {
  const c = await oracledb.getConnection({
    user: e.ORACLE_USER,
    password: e.ORACLE_PASSWORD,
    connectString: e.ORACLE_CONNECT_STRING,
  });
  try {
    try {
      await c.execute(`BEGIN DEALERHUB_SECURITY_PKG.SET_PUBLIC_TENANT_BY_HOST(:host); END;`, { host });
    } catch (err) {
      if (isUnresolvedPublicHostError(err)) {
        const report = diagnose(err);
        return { ok: false, kind: 'unavailable', incidentId: report.incidentId, publicMsg: report.publicSafeMessage };
      }
      throw err;
    }
    const r = await c.execute(
      `SELECT T.TENANT_ID, T.TENANT_CODE, T.DEALER_NAME FROM TENANTS T
       WHERE T.TENANT_ID = TO_NUMBER(SYS_CONTEXT('DEALERHUB_CTX','TENANT_ID')) AND T.ACTIVE_YN='Y'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return { ok: true, tenant: r.rows[0] || null };
  } finally {
    try { await c.execute(`BEGIN DEALERHUB_SECURITY_PKG.CLEAR_CONTEXT; END;`); } catch (_) {}
    await c.close();
  }
}

(async () => {
  const silk = await resolveHost('dealerhub-k1fc.onrender.com');
  console.log('SILK', JSON.stringify(silk));
  if (!silk.ok || !silk.tenant || silk.tenant.TENANT_CODE !== 'SILKROAD' || silk.tenant.TENANT_ID !== 62) {
    throw new Error('Silk Road host did not resolve to SILKROAD/62');
  }

  const unknown = await resolveHost('unknown-dealerhub-host.example');
  console.log('UNKNOWN', JSON.stringify(unknown));
  if (unknown.ok || unknown.kind !== 'unavailable' || unknown.incidentId !== 'INC-002') {
    throw new Error('unknown host should fail closed INC-002');
  }
  if (unknown.publicMsg !== PUBLIC_UNAVAILABLE_MESSAGE) throw new Error('public message mismatch');
  if (/Shelby|Silk|ORA-|TENANT/i.test(unknown.publicMsg)) throw new Error('leak in public msg');

  // localhost still Shelby 21 — no cross-tenant from unknown
  const loc = await resolveHost('localhost');
  console.log('LOCAL', JSON.stringify(loc));
  if (!loc.ok || loc.tenant.TENANT_ID !== 21) throw new Error('localhost mapping broken');

  console.log('PASS live resolve: Silk Road ok; unknown → INC-002 unavailable; localhost Shelby unchanged; CLEAR_CONTEXT used.');
})().catch((e) => { console.error(e); process.exit(1); });
