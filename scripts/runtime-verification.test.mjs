import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRuntimeSummary,
  findRuntimeLogIssues,
  formatProbeProgress,
  formatRuntimeDuration,
  isAcceptableStatus,
  parseRuntimeArguments,
  validateProbe,
} from "./runtime-verification.mjs";

test("runtime-parametre bruger sikre standarder", () => {
  const options = parseRuntimeArguments([]);
  assert.equal(options.backendUrl, "http://localhost:3001/");
  assert.equal(options.frontendUrl, "http://localhost:3000/");
  assert.equal(options.timeoutMs, 120_000);
  assert.equal(options.intervalMs, 2_000);
});
test("runtime-parametre kan overskrives eksplicit", () => {
  const options = parseRuntimeArguments([
    "--backend-url=http://127.0.0.1:4001/health",
    "--frontend-url=https://example.test/login",
    "--timeout-ms=120000",
    "--interval-ms=2500",
    "--show-logs",
    "--since=2026-07-30T05:00:00Z",
  ]);
  assert.equal(options.backendUrl, "http://127.0.0.1:4001/health");
  assert.equal(options.frontendUrl, "https://example.test/login");
  assert.equal(options.timeoutMs, 120_000);
  assert.equal(options.intervalMs, 2_500);
  assert.equal(options.showLogs, true);
  assert.equal(options.since, "2026-07-30T05:00:00.000Z");
});
test("ukendte og ugyldige parametre afvises", () => {
  assert.throws(() => parseRuntimeArguments(["--unknown"]), /Ukendt runtime-parameter/);
  assert.throws(() => parseRuntimeArguments(["--timeout-ms=0"]), /positivt heltal/);
  assert.throws(() => parseRuntimeArguments(["--interval-ms=2000", "--timeout-ms=1000"]), /må ikke være større/);
  assert.throws(() => parseRuntimeArguments(["--frontend-url=file:\/\/tmp\/x"]), /http eller https/);
});
test("HTTP 2xx og 3xx accepteres som standard", () => {
  assert.equal(isAcceptableStatus(200), true);
  assert.equal(isAcceptableStatus(302), true);
  assert.equal(isAcceptableStatus(399), true);
  assert.equal(isAcceptableStatus(404), false);
  assert.equal(isAcceptableStatus(0), false);
});
test("backend-readiness kan acceptere HTTP 4xx men aldrig 5xx", () => {
  assert.equal(isAcceptableStatus(401, { acceptClientErrors: true }), true);
  assert.equal(isAcceptableStatus(404, { acceptClientErrors: true }), true);
  assert.equal(isAcceptableStatus(499, { acceptClientErrors: true }), true);
  assert.equal(isAcceptableStatus(500, { acceptClientErrors: true }), false);
  assert.equal(validateProbe({ status: 404, acceptClientErrors: true }), null);
  assert.equal(validateProbe({ status: 503, acceptClientErrors: true }), "HTTP 503");
});
test("proben kan fortsat kræve forventet svartekst", () => {
  assert.equal(validateProbe({ status: 200, body: "Hello World!", expectedText: "Hello World!" }), null);
  assert.match(validateProbe({ status: 200, body: "forkert", expectedText: "Hello World!" }), /manglede teksten/);
});
test("forventet SIGTERM-støj fra docker restart ignoreres", () => {
  const issues = findRuntimeLogIssues(`
backend | npm error path /app
backend | npm error command failed
backend | npm error signal SIGTERM
backend | npm error command sh -c node ./scripts/start-container.mjs
backend | npm error A complete log of this run can be found in: /tmp/log
frontend | ✓ Ready in 500ms
`);
  assert.deepEqual(issues, []);
});
test("reelle startupfejl findes i de aktuelle logs", () => {
  const issues = findRuntimeLogIssues(`
backend | PrismaClientInitializationError: database unavailable
frontend | Failed to compile
frontend | npm error code 1
`);
  assert.equal(issues.length, 3);
  assert.match(issues[0], /PrismaClientInitializationError/);
});
test("almindelige routes og udviklingsadvarsler markeres ikke som fatale", () => {
  const issues = findRuntimeLogIssues(`
backend | LOG [RouterExplorer] Mapped {/shifts, GET} route
backend | LOG [Startup] Backend klar på port 3001 efter 1,2 s.
frontend | ⚠ Slow filesystem detected.
frontend | GET /dashboard 200 in 120ms
`);
  assert.deepEqual(issues, []);
});
test("runtime-varigheder formateres læsbart", () => {
  assert.equal(formatRuntimeDuration(450), "450 ms");
  assert.equal(formatRuntimeDuration(3_240), "3,2 s");
  assert.equal(formatRuntimeDuration(Number.NaN), "ukendt tid");
});
test("probe-status viser målt readiness", () => {
  assert.equal(formatProbeProgress([
    { label: "Backend", error: null, readyAfterMs: 2_400 },
    { label: "Frontend", error: "fetch failed", readyAfterMs: null },
  ]), "Backend: klar efter 2,4 s · Frontend: venter (fetch failed)");
});

test("runtime-resume indeholder status og readiness for begge services", () => {
  assert.equal(
    buildRuntimeSummary({
      backendReadyMs: 2_400,
      backendStatus: 404,
      frontendReadyMs: 900,
      frontendStatus: 200,
      logIssueCount: 0,
    }),
    "Runtime-smoke OK: backend HTTP 404 efter 2,4 s, frontend HTTP 200 efter 900 ms, 0 nye fatale logfejl.",
  );
});
