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

import { collectProductionComposeProblems } from "./check-production-compose.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const fixtureFiles = [
  "docker-compose.production.yml",
  "deploy/Caddyfile",
  ".env.production.example",
  "docs/production-deployment.md",
  "scripts/rehearse-production-compose.mjs",
  "package.json",
];

function withFixture(run) {
  const root = mkdtempSync(resolve(tmpdir(), "cinema-production-compose-"));
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

test("den aktuelle repository-tilstand opfylder production Compose-kravene", () => {
  assert.deepEqual(collectProductionComposeProblems(), []);
});

test("kontrollen afviser publicerede database- og backendporte", () => {
  withFixture((root) => {
    replace(
      root,
      "docker-compose.production.yml",
      "    volumes:\n      - production_postgres_data:/var/lib/postgresql/data",
      '    ports:\n      - "5432:5432"\n    volumes:\n      - production_postgres_data:/var/lib/postgresql/data',
    );
    replace(
      root,
      "docker-compose.production.yml",
      '    expose:\n      - "3001"',
      '    ports:\n      - "3001:3001"',
    );
    const problems = collectProductionComposeProblems(root);
    assert.ok(problems.some((problem) => problem.includes('"5432:5432"')));
    assert.ok(problems.some((problem) => problem.includes('"3001:3001"')));
  });
});

test("kontrollen afviser manglende migration og uploadpersistens", () => {
  withFixture((root) => {
    replace(
      root,
      "docker-compose.production.yml",
      'command: ["npx", "prisma", "migrate", "deploy"]',
      'command: ["node", "-e", "process.exit(0)"]',
    );
    replace(
      root,
      "docker-compose.production.yml",
      "      - production_uploads:/app/uploads",
      "",
    );
    const problems = collectProductionComposeProblems(root);
    assert.ok(problems.some((problem) => problem.includes("prisma")));
    assert.ok(problems.some((problem) => problem.includes("production_uploads")));
  });
});

test("kontrollen afviser manglende WebSocket- og uploadproxy", () => {
  withFixture((root) => {
    replace(root, "deploy/Caddyfile", "path /socket.io/*", "path /disabled-socket/*");
    replace(root, "deploy/Caddyfile", "path /uploads/*", "path /disabled-uploads/*");
    const problems = collectProductionComposeProblems(root);
    assert.ok(problems.some((problem) => problem.includes("/socket.io")));
    assert.ok(problems.some((problem) => problem.includes("/uploads")));
  });
});

test("kontrollen afviser kildekode-bind mounts og fastlåste containernavne", () => {
  withFixture((root) => {
    replace(
      root,
      "docker-compose.production.yml",
      "    command: [\"npm\", \"run\", \"start:container\"]",
      "    container_name: production-backend\n    command: [\"npm\", \"run\", \"start:container\"]\n    volumes:\n      - ./backend:/app",
    );
    const problems = collectProductionComposeProblems(root);
    assert.ok(problems.some((problem) => problem.includes("container_name")));
    assert.ok(problems.some((problem) => problem.includes("./backend:/app")));
  });
});

test("kontrollen afviser den versionsfølsomme docker compose port-probe", () => {
  withFixture((root) => {
    replace(
      root,
      "scripts/rehearse-production-compose.mjs",
      'composeArgs("ps", "-q", service)',
      'composeArgs("port", service, "5432")',
    );
    const problems = collectProductionComposeProblems(root);
    assert.ok(problems.some((problem) => problem.includes("docker compose port")));
    assert.ok(problems.some((problem) => problem.includes('composeArgs("ps", "-q", service)')));
  });
});
