const fs = require("fs");
const vm = require("vm");
const assert = require("node:assert/strict");
const ts = require("typescript");
const source = fs.readFileSync(
  require("path").join(__dirname, "../lib/dealer-metrics.ts"),
  "utf8",
);
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const sandbox = { exports: {}, require, Date, Intl };
vm.runInNewContext(output, sandbox);
const { dealerMetrics, attentionReasons, inventoryAge } = sandbox.exports;
const now = new Date("2026-09-15T16:00:00Z");
const base = {
  VEHICLE_STATUS: "AVAILABLE",
  PUBLIC_YN: "Y",
  PHOTO_COUNT: 1,
  PRIMARY_IMAGE_URL: "photo",
  ASKING_PRICE: 10000,
  CREATED_AT: "2026-09-01T04:00:00Z",
  SOLD_AT: null,
};
const sold = (date, more = {}) => ({
  ...base,
  VEHICLE_STATUS: "SOLD",
  SOLD_AT: date,
  ...more,
});
const rows = [
  sold("2026-09-01T03:59:59Z"),
  sold("2026-09-01T04:00:00Z"),
  sold("2026-09-14T04:00:00Z"),
  sold("2026-09-14T03:59:59Z"),
  sold(null),
  sold("bad"),
  sold("2026-09-16T00:00:00Z"),
  { ...base, SOLD_AT: "2026-09-14T04:00:00Z" },
  sold("2026-09-14T04:00:00Z", { VEHICLE_STATUS: "ARCHIVED" }),
];
const m = dealerMetrics(rows, now);
assert.equal(m.lastMonth, 1);
assert.equal(m.thisMonth, 3);
assert.equal(m.thisWeek, 1);
assert.equal(m.undatedSold, 3);
assert.equal(m.soldAskingValue, 30000);
assert.equal(m.active.length, 1);
const january = dealerMetrics(
  [sold("2025-12-31T18:00:00Z")],
  new Date("2026-01-03T16:00:00Z"),
);
assert.equal(january.previousMonth, "2025-12");
assert.equal(january.lastMonth, 1);
assert.equal(january.monthRows[0].key, "2025-08");
const sunday = dealerMetrics(
  [sold("2026-09-07T04:00:00Z"), sold("2026-09-07T03:59:59Z")],
  new Date("2026-09-14T03:30:00Z"),
);
assert.equal(sunday.thisWeek, 1);
assert.equal(dealerMetrics([], now).averageDaysToSell, null);
assert.equal(
  dealerMetrics([sold("2026-09-11T04:00:00Z")], now).averageDaysToSell,
  10,
);
assert.equal(
  dealerMetrics([sold("2026-09-11T04:00:00Z", { CREATED_AT: null })], now)
    .averageDaysToSell,
  null,
);
assert.equal(
  attentionReasons(
    { ...base, PHOTO_COUNT: 0, PRIMARY_IMAGE_URL: null },
    now,
  ).includes("Missing photos"),
  true,
);
assert.equal(
  attentionReasons(
    { ...base, PHOTO_COUNT: 2, PRIMARY_IMAGE_URL: null },
    now,
  ).includes("Missing photos"),
  false,
);
assert.equal(
  attentionReasons(
    { ...base, PHOTO_COUNT: 2, PRIMARY_IMAGE_URL: null },
    now,
  ).includes("Choose a cover photo"),
  true,
);
assert.equal(
  attentionReasons({ ...base, VEHICLE_STATUS: "ARCHIVED", PHOTO_COUNT: 0 }, now)
    .length,
  0,
);
const aged = { ...base, CREATED_AT: new Date(now.getTime() - 60 * 86400000) };
assert.equal(inventoryAge(aged, now), 60);
assert.equal(dealerMetrics([aged], now).aging, 1);
assert.equal(inventoryAge({ ...base, CREATED_AT: "2027-01-01" }, now), null);
console.log(
  "PASS: date boundaries, Monday/Sunday, year rollover, undated/future sales, reopened/archived exclusion, asking value, duration, photo counts, and 60-day aging.",
);
