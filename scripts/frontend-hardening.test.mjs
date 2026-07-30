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

import { collectFrontendHardeningProblems } from "./check-frontend-hardening.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const fixtureFiles = [
  ".dockerignore",
  ".github/workflows/release-checks.yml",
  "docker-compose.yml",
  "package.json",
  "scripts/run-release-checks.mjs",
  "frontend/Dockerfile",
  "frontend/app/components/AppMenu.tsx",
  "frontend/next.config.ts",
  "frontend/package.json",
  "frontend/package-lock.json",
  "frontend/scripts/start-container.mjs",
  "frontend/scripts/report-frontend-audit.mjs",
];

function withFixture(run) {
  const root = mkdtempSync(resolve(tmpdir(), "cinema-frontend-hardening-"));
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

test("den aktuelle repository-tilstand opfylder frontend-hardening", () => {
  assert.deepEqual(collectFrontendHardeningProblems(), []);
});

test("hardening-kontrollen afviser development-server og npm install", () => {
  withFixture((root) => {
    replace(root, "frontend/Dockerfile", "RUN npm ci", "RUN npm install");
    replace(
      root,
      "frontend/Dockerfile",
      'CMD ["node", "frontend/scripts/start-container.mjs"]',
      'CMD ["npm", "run", "dev"]',
    );
    const problems = collectFrontendHardeningProblems(root);
    assert.ok(problems.some((problem) => /npm install/.test(problem)));
    assert.ok(problems.some((problem) => /development-serveren/.test(problem)));
  });
});

test("hardening-kontrollen afviser manglende standalone-output og runtime-bind-mount", () => {
  withFixture((root) => {
    replace(root, "frontend/next.config.ts", 'output: "standalone",', "");
    replace(
      root,
      "docker-compose.yml",
      "    depends_on:\n      - backend\n  frontend-build:",
      "    depends_on:\n      - backend\n    volumes:\n      - ./frontend:/app/frontend\n  frontend-build:",
    );
    const problems = collectFrontendHardeningProblems(root);
    assert.ok(problems.some((problem) => /output: "standalone"/.test(problem)));
    assert.ok(problems.some((problem) => /runtime-service maa ikke bind-mounte/.test(problem)));
  });
});

test("hardening-kontrollen afviser saarbart Next.js, ws, postcss, sharp og uens Turbopack-root", () => {
  withFixture((root) => {
    replace(root, "frontend/package.json", '"next": "16.2.12"', '"next": "16.2.6"');
    replace(root, "frontend/package.json", '"ws": "8.21.0"', '"ws": "8.18.3"');
    replace(root, "frontend/package.json", '"postcss": "8.5.25"', '"postcss": "8.5.17"');
    replace(root, "frontend/package.json", '"sharp": "0.35.3"', '"sharp": "0.34.5"');
    replace(
      root,
      "frontend/next.config.ts",
      'root: path.resolve(__dirname, "..")',
      "root: path.resolve(__dirname)",
    );
    const problems = collectFrontendHardeningProblems(root);
    assert.ok(problems.some((problem) => /next 16\.2\.12/.test(problem)));
    assert.ok(problems.some((problem) => /ws 8\.21\.0/.test(problem)));
    assert.ok(problems.some((problem) => /postcss 8\.5\.25/.test(problem)));
    assert.ok(problems.some((problem) => /sharp 0\.35\.3/.test(problem)));
    assert.ok(problems.some((problem) => /root: path\.resolve/.test(problem)));
  });
});


test("hardening-kontrollen afviser fejlkonverterede danske tegn", () => {
  withFixture((root) => {
    replace(
      root,
      "frontend/app/components/AppMenu.tsx",
      'label: "Tid & fravær"',
      'label: "Tid & fravÃ¦r"',
    );
    const problems = collectFrontendHardeningProblems(root);
    assert.ok(problems.some((problem) => /fejlkonverteret UTF-8/.test(problem)));
    assert.ok(problems.some((problem) => /AppMenu\.tsx/.test(problem)));
  });
});
