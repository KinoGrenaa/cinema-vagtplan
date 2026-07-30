import assert from "node:assert/strict";
import test from "node:test";

import {
  createAuditSummary,
  resolveNpmInvocation,
} from "../frontend/scripts/report-frontend-audit.mjs";

function report({ low = 0, moderate = 0, high = 0, critical = 0 } = {}) {
  return {
    metadata: {
      vulnerabilities: {
        low,
        moderate,
        high,
        critical,
        total: low + moderate + high + critical,
      },
    },
  };
}

test("frontend auditrapport adskiller runtime- og dev-only-fund", () => {
  const summary = createAuditSummary(report(), report({ high: 3 }));
  assert.equal(summary.production.total, 0);
  assert.equal(summary.complete.high, 3);
  assert.equal(summary.developmentOnly, 3);
});

test("frontend auditrapport afviser ethvert runtime-fund", () => {
  assert.throws(
    () => createAuditSummary(report({ moderate: 1 }), report({ moderate: 1 })),
    /produktionaudit har stadig 1 fund/,
  );
});

test("auditrapporten bruger npm-processen gennem den aktuelle Node-runtime", () => {
  assert.deepEqual(
    resolveNpmInvocation({ npm_execpath: "/npm/npm-cli.js" }, "/node"),
    { command: "/node", argsPrefix: ["/npm/npm-cli.js"] },
  );
  assert.throws(() => resolveNpmInvocation({}, "/node"), /npm_execpath mangler/);
});
