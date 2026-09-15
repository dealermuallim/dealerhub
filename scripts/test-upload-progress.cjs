const fs = require("fs"),
  vm = require("vm"),
  assert = require("node:assert/strict");
const ts = require("typescript");
let instance;
class FakeXHR {
  constructor() {
    instance = this;
    this.upload = {};
  }
  open(method, url) {
    this.method = method;
    this.url = url;
  }
  send(body) {
    this.body = body;
  }
}
const context = { exports: {}, XMLHttpRequest: FakeXHR };
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(
      require("path").join(__dirname, "../lib/upload-with-progress.ts"),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
  context,
);
(async () => {
  const seen = [];
  let complete = false;
  const pending = context.exports
    .uploadWithProgress("/api/vehicles/22/images", {}, (p) => seen.push(p))
    .then((v) => {
      complete = true;
      return v;
    });
  assert.equal(seen[0], null);
  instance.upload.onprogress({
    lengthComputable: true,
    loaded: 25,
    total: 100,
  });
  assert.equal(seen.at(-1), 25);
  instance.upload.onprogress({
    lengthComputable: true,
    loaded: 100,
    total: 100,
  });
  await Promise.resolve();
  assert.equal(complete, false, "100% transfer must not mean server success");
  instance.status = 200;
  instance.responseText = JSON.stringify({ uploaded: [1, 2] });
  instance.onload();
  const result = await pending;
  assert.equal(result.ok, true);
  assert.equal((await result.json()).uploaded.length, 2);
  const failure = context.exports.uploadWithProgress(
    "/api/vehicles/22/images",
    {},
    () => {},
  );
  instance.status = 500;
  instance.responseText = '{"error":"Storage failed"}';
  instance.onload();
  assert.equal((await failure).ok, false);
  const timeout = context.exports.uploadWithProgress(
    "/api/vehicles/22/images",
    {},
    () => {},
  );
  instance.ontimeout();
  await assert.rejects(timeout, /Check the vehicle/);
  console.log(
    "PASS: real byte progress, transfer/server completion separation, HTTP failure, and timeout handling.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
