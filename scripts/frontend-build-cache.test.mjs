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

import { collectFrontendBuildCacheProblems } from "./check-frontend-build-cache.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const fixtureFiles = [
  ".github/workflows/release-checks.yml",
  "docs/frontend-build-cache.md",
  "frontend/Dockerfile",
  "package.json",
];

function withFixture(run) {
  const root = mkdtempSync(resolve(tmpdir(), "cinema-frontend-build-cache-"));
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

test("den aktuelle repository-tilstand opfylder frontend build-cachekravene", () => {
  assert.deepEqual(collectFrontendBuildCacheProblems(), []);
});

test("build-cachekontrollen afviser manglende Next.js cache mount", () => {
  withFixture((root) => {
    replace(
      root,
      "frontend/Dockerfile",
      "id=cinema-next-build,target=/app/frontend/.next/cache",
      "id=cinema-next-build,target=/tmp/next-cache",
    );
    const problems = collectFrontendBuildCacheProblems(root);
    assert.ok(problems.some((problem) => /Next\.js-buildet/.test(problem)));
  });
});

test("build-cachekontrollen afviser manglende eller sammenblandet CI-cache", () => {
  withFixture((root) => {
    replace(root, ".github/workflows/release-checks.yml", "uses: actions/cache@v4", "uses: actions/cache@v3");
    replace(
      root,
      ".github/workflows/release-checks.yml",
      "cache-from: type=gha,scope=frontend-flow-tests",
      "cache-from: type=gha,scope=frontend-runtime",
    );
    const problems = collectFrontendBuildCacheProblems(root);
    assert.ok(problems.some((problem) => /bevare frontend\/\.next\/cache/.test(problem)));
    assert.ok(problems.some((problem) => /frontend-flow-tests/.test(problem)));
  });
});

test("build-cachekontrollen afviser cache i runtime-imaget", () => {
  withFixture((root) => {
    replace(
      root,
      "frontend/Dockerfile",
      "COPY --from=build --chown=nextjs:nodejs /app/frontend/.next/static ./frontend/.next/static",
      "COPY --from=build --chown=nextjs:nodejs /app/frontend/.next/static ./frontend/.next/static\nCOPY --from=build /app/frontend/.next/cache ./frontend/.next/cache",
    );
    const problems = collectFrontendBuildCacheProblems(root);
    assert.ok(problems.some((problem) => /ikke kopieres ind i runtime-imaget/.test(problem)));
  });
});
