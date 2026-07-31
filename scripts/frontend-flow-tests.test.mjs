import assert from "node:assert/strict";
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";

import { collectFrontendFlowProblems } from "./check-frontend-flows.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const fixtureFiles = [
  ".gitignore",
  ".github/workflows/release-checks.yml",
  "docker-compose.yml",
  "package.json",
  "scripts/run-release-checks.mjs",
  "frontend/Dockerfile",
  "frontend/app/page.tsx",
  "frontend/app/providers/CinemaModulesProvider.tsx",
  "frontend/app/(app)/payroll/hooks/usePayrollPage.ts",
  "frontend/package.json",
  "frontend/package-lock.json",
  "frontend/playwright.config.ts",
  "frontend/scripts/run-flow-tests-container.mjs",
  "frontend/scripts/run-flow-tests-host.mjs",
  "frontend/tests/flows/critical-flows.spec.ts",
];

function withFixture(run) {
  const root = mkdtempSync(resolve(tmpdir(), "cinema-frontend-flows-"));
  try {
    for (const relativePath of fixtureFiles) {
      const source = resolve(repoRoot, relativePath);
      const target = resolve(root, relativePath);
      mkdirSync(dirname(target), { recursive: true });
      cpSync(source, target);
    }
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function replace(root, relativePath, searchValue, replacement) {
  const path = resolve(root, relativePath);
  const source = readFileSync(path, "utf8");
  assert.ok(source.includes(searchValue), `${relativePath} mangler testmarkøren`);
  writeFileSync(path, source.replace(searchValue, replacement), "utf8");
}

test("den aktuelle repository-tilstand opfylder frontend-flowtestkravene", () => {
  assert.deepEqual(collectFrontendFlowProblems(), []);
});

test("flowtestkontrollen afviser uens Playwright-pakke og Docker-image", () => {
  withFixture((root) => {
    replace(
      root,
      "frontend/package.json",
      '"@playwright/test": "1.62.0"',
      '"@playwright/test": "1.61.1"',
    );
    replace(
      root,
      "frontend/Dockerfile",
      "mcr.microsoft.com/playwright:v1.62.0-noble",
      "mcr.microsoft.com/playwright:v1.61.1-noble",
    );
    const problems = collectFrontendFlowProblems(root);
    assert.ok(problems.some((problem) => /@playwright\/test 1\.62\.0/.test(problem)));
    assert.ok(problems.some((problem) => /playwright:v1\.62\.0-noble/.test(problem)));
  });
});

test("flowtestkontrollen afviser manglende kritisk scenarie", () => {
  withFixture((root) => {
    replace(
      root,
      "frontend/tests/flows/critical-flows.spec.ts",
      'test("401 fra apiFetch rydder sessionen og sender brugeren til login"',
      'test.skip("401 fra apiFetch rydder sessionen og sender brugeren til login"',
    );
    const problems = collectFrontendFlowProblems(root);
    assert.ok(problems.some((problem) => /11 tests/.test(problem)));
  });
});

test("flowtestkontrollen afviser kildekode-bind mount og manglende CI-gate", () => {
  withFixture((root) => {
    replace(
      root,
      "docker-compose.yml",
      "      - ./frontend/test-results:/tests/test-results",
      "      - ./frontend:/tests",
    );
    replace(
      root,
      ".github/workflows/release-checks.yml",
      "name: Critical frontend flows",
      "name: Frontend browser smoke",
    );
    const workflowPath = resolve(root, ".github", "workflows", "release-checks.yml");
    const workflow = readFileSync(workflowPath, "utf8");
    const targetMarker = workflow.includes("target: flow-tests")
      ? "target: flow-tests"
      : "--target flow-tests";
    assert.ok(workflow.includes(targetMarker), "Workflow-fixturen mangler flow-testtarget");
    writeFileSync(
      workflowPath,
      workflow.replace(
        targetMarker,
        targetMarker === "target: flow-tests" ? "target: runtime" : "--target runtime",
      ),
      "utf8",
    );
    const problems = collectFrontendFlowProblems(root);
    assert.ok(problems.some((problem) => /maa ikke bind-mounte kildekode/.test(problem)));
    assert.ok(problems.some((problem) => /Critical frontend flows/.test(problem)));
    assert.ok(problems.some((problem) => /flow-testtarget/.test(problem)));
  });
});

test("flowtestkontrollen afviser manglende biografmock og gentaget sessionsseed", () => {
  withFixture((root) => {
    replace(
      root,
      "frontend/tests/flows/critical-flows.spec.ts",
      'pathname === "/auth/default-cinema-options"',
      'pathname === "/auth/default-cinema-options-disabled"',
    );
    replace(
      root,
      "frontend/tests/flows/critical-flows.spec.ts",
      "sessionStorage.getItem(seedKey)",
      "localStorage.getItem(seedKey)",
    );
    const problems = collectFrontendFlowProblems(root);
    assert.ok(problems.some((problem) => /default-cinema-options/.test(problem)));
    assert.ok(problems.some((problem) => /sessionStorage/.test(problem)));
  });
});

test("flowtestkontrollen afviser dobbelt login-navigation", () => {
  withFixture((root) => {
    replace(
      root,
      "frontend/app/page.tsx",
      "      login(data.access_token, data.user);",
      "      login(data.access_token, data.user);\n      await routeAuthenticatedUser(data.user.role);",
    );
    const problems = collectFrontendFlowProblems(root);
    assert.ok(problems.some((problem) => /ekstra navigation/.test(problem)));
  });
});



test("flowtestkontrollen afviser løndata før moduladgang", () => {
  withFixture((root) => {
    replace(
      root,
      "frontend/app/(app)/payroll/hooks/usePayrollPage.ts",
      '!modulesLoading &&',
      'modulesLoading &&',
    );
    replace(
      root,
      "frontend/tests/flows/critical-flows.spec.ts",
      "const payrollCalls = calls.filter",
      "const ignoredPayrollCalls = calls.filter",
    );
    const problems = collectFrontendFlowProblems(root);
    assert.ok(problems.some((problem) => /modulstyret dataadgang/.test(problem)));
    assert.ok(problems.some((problem) => /payrollCalls/.test(problem)));
  });
});

test("flowtestkontrollen afviser modulstatus fra en tidligere auth-kontekst", () => {
  withFixture((root) => {
    replace(
      root,
      "frontend/app/providers/CinemaModulesProvider.tsx",
      "resolvedContextKey !== activeContextKey",
      "resolvedContextKey === activeContextKey",
    );
    const problems = collectFrontendFlowProblems(root);
    assert.ok(problems.some((problem) => /kontekst-synkronisering/.test(problem)));
  });
});
