import { parseQuickAdd } from './index.ts';

type Check = { name: string; ok: boolean; detail?: string };

function fieldMap(patch: ReturnType<typeof parseQuickAdd>) {
  const m: Record<string, { proposed: unknown; state: string }> = {};
  for (const f of patch.fields) m[f.key] = { proposed: f.proposed, state: f.state };
  return m;
}

const checks: Check[] = [];

function expectProp(
  name: string,
  text: string,
  key: string,
  proposed: unknown,
  opts?: { decoded?: Record<string, unknown>; current?: Record<string, unknown>; state?: string }
) {
  const patch = parseQuickAdd({
    text,
    vin: 'TESTVIN0000000001',
    decoded: (opts?.decoded || {}) as any,
    current: (opts?.current || opts?.decoded || {}) as any,
  });
  const m = fieldMap(patch);
  const got = m[key];
  const ok =
    !!got &&
    got.proposed === proposed &&
    (!opts?.state || got.state === opts.state);
  checks.push({
    name,
    ok,
    detail: ok
      ? undefined
      : `got=${JSON.stringify(got)} unresolved=${JSON.stringify(patch.unresolved)}`,
  });
}

function expectUnresolved(name: string, text: string) {
  const patch = parseQuickAdd({ text, vin: 'TESTVIN0000000001' });
  const ok =
    patch.fields.length === 0 &&
    patch.unresolved.some((u) => /bare number|unrecognized|14995/.test(u.span + u.reason));
  checks.push({
    name,
    ok,
    detail: ok ? undefined : JSON.stringify(patch),
  });
}

expectProp('78k miles', '78k miles', 'mileage', 78000);
expectProp('seventy eight thousand miles', 'seventy eight thousand miles', 'mileage', 78000);
expectProp('$14995', '$14995', 'askingPrice', 14995);
expectProp('price 14995', 'price 14995', 'askingPrice', 14995);
expectProp(
  'price fourteen thousand nine hundred ninety five',
  'price fourteen thousand nine hundred ninety five',
  'askingPrice',
  14995
);
expectUnresolved('bare 14995', '14995');
expectProp('stock A1234', 'stock A1234', 'stockNumber', 'A1234');
expectProp(
  'stock number A twelve thirty four',
  'stock number A twelve thirty four',
  'stockNumber',
  'A1234'
);

{
  const patch = parseQuickAdd({ text: 'black on black', vin: 'X' });
  const m = fieldMap(patch);
  const ok =
    m.exteriorColor?.proposed === 'Black' && m.interiorColor?.proposed === 'Black';
  checks.push({ name: 'black on black', ok, detail: JSON.stringify(m) });
}
{
  const patch = parseQuickAdd({ text: 'pearl white with tan leather', vin: 'X' });
  const m = fieldMap(patch);
  const ok =
    m.exteriorColor?.proposed === 'Pearl White' && m.interiorColor?.proposed === 'Tan';
  checks.push({ name: 'pearl white with tan leather', ok, detail: JSON.stringify(m) });
}

expectProp('featured', 'featured', 'featured', true);
expectProp('not featured', 'not featured', 'featured', false);
expectProp('pending', 'pending', 'vehicleStatus', 'PENDING');
expectProp('available', 'available', 'vehicleStatus', 'AVAILABLE');
expectProp('hold', 'hold', 'vehicleStatus', 'HOLD');
expectProp("don't put it online yet", "don't put it online yet", 'public', false);
expectProp('show it on the website', 'show it on the website', 'public', true);

expectProp('EX-L not EX', 'EX-L not EX', 'trim', 'EX-L', {
  decoded: { trim: 'EX' },
  current: { trim: 'EX' },
  state: 'CONFLICT',
});
expectProp('white actually, not black', 'white actually, not black', 'exteriorColor', 'White', {
  decoded: { exteriorColor: 'Black' },
  current: { exteriorColor: 'Black' },
  state: 'CONFLICT',
});

{
  const patch = parseQuickAdd({
    text: "82k miles, black on black, stock 9214, $14995, featured, pending, don't put it online",
    vin: 'TESTVIN0000000001',
  });
  const m = fieldMap(patch);
  const expected: Record<string, unknown> = {
    mileage: 82000,
    exteriorColor: 'Black',
    interiorColor: 'Black',
    stockNumber: '9214',
    askingPrice: 14995,
    featured: true,
    vehicleStatus: 'PENDING',
    public: false,
  };
  const missing = Object.entries(expected).filter(([k, v]) => m[k]?.proposed !== v);
  const importantUnresolved = patch.unresolved.filter(
    (u) => !/^(and|with|,)$/i.test(u.span)
  );
  const ok = missing.length === 0 && importantUnresolved.length === 0;
  checks.push({
    name: 'combination',
    ok,
    detail: ok
      ? undefined
      : JSON.stringify({ missing, unresolved: patch.unresolved, fields: m }),
  });
}


// --- QA negation regression ---
expectProp("don't show it online", "don't show it online", 'public', false);
expectProp('do not show it online', 'do not show it online', 'public', false);
expectProp('show it online', 'show it online', 'public', true);
expectProp("don't put it online", "don't put it online", 'public', false);
expectProp('keep it offline', 'keep it offline', 'public', false);
expectProp('not featured (neg)', 'not featured', 'featured', false);
expectProp('featured (pos)', 'featured', 'featured', true);

function expectNoStatus(name: string, text: string) {
  const patch = parseQuickAdd({ text, vin: 'TESTVIN0000000001' });
  const m = fieldMap(patch);
  const ok = !m.vehicleStatus && patch.unresolved.some((u) => /not\s+/i.test(u.span));
  checks.push({
    name,
    ok,
    detail: ok ? undefined : JSON.stringify(patch),
  });
}
expectNoStatus('not pending', 'not pending');
expectNoStatus('not available', 'not available');
expectNoStatus('not sold', 'not sold');
expectNoStatus('not hold', 'not hold');

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok);
console.log(`PASS ${passed} / ${checks.length}`);
for (const f of failed) console.log('FAIL', f.name, f.detail);
for (const c of checks.filter((x) => x.ok)) console.log('OK', c.name);