import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const workflow = readFileSync(
  resolve(root, ".github", "workflows", "release-checks.yml"),
  "utf8",
).replaceAll("\r\n", "\n");

function jobBlock(name, nextName) {
  const match = workflow.match(
    new RegExp(
      `\\n  ${name}:\\n([\\s\\S]*?)\\n  ${nextName}:`,
    ),
  );
  assert.ok(match, `Kunne ikke finde jobblokken ${name}`);
  return match[1];
}

test("CI-installationer undgaar implicit npm audit", () => {
  assert.match(
    jobBlock("backend", "backend-runtime"),
    /npm ci --no-audit/,
  );
  assert.match(
    jobBlock("frontend", "frontend-flows"),
    /npm ci --no-audit/,
  );
});

test("CI bruger audit:report som eneste eksplicitte audit-gate", () => {
  for (const block of [
    jobBlock("backend", "backend-runtime"),
    jobBlock("frontend", "frontend-flows"),
  ]) {
    assert.doesNotMatch(block, /npm run audit:prod/);
    assert.match(block, /npm run audit:report/);
  }
});

test("auditrapporterne bevarer production-audit og samlet audit", () => {
  for (const relative of [
    "backend/scripts/report-backend-audit.mjs",
    "frontend/scripts/report-frontend-audit.mjs",
  ]) {
    const report = readFileSync(resolve(root, relative), "utf8");
    assert.match(report, /runAudit\(\["--omit=dev"\]\)/);
    assert.match(report, /runAudit\(\[\]\)/);
    assert.match(report, /production\.total !== 0/);
  }
});
