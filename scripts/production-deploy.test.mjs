import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { collectProductionDeployProblems } from "./check-production-deploy.mjs";
import {
  changedMigrationPaths,
  deploymentRevisionLabel,
  parseCommonArguments,
  productionComposeArgs,
  productionProcessEnv,
  validateDeploymentRecord,
} from "./production-deploy-lib.mjs";
import { parseProductionDeployArgs } from "./production-deploy.mjs";
import { parseProductionRollbackArgs } from "./production-rollback.mjs";

const repoRoot = resolve(import.meta.dirname, "..");

function copyRepositoryFixture() {
  const root = mkdtempSync(join(tmpdir(), "cinema-production-deploy-"));
  for (const relativePath of [
    "package.json",
    "docker-compose.production.yml",
    "docs/production-deploy.md",
    "docs/production-deployment.md",
    "scripts/production-deploy-lib.mjs",
    "scripts/production-deploy.mjs",
    "scripts/production-rollback.mjs",
  ]) {
    const target = join(root, relativePath);
    mkdirSync(resolve(target, ".."), { recursive: true });
    cpSync(join(repoRoot, relativePath), target, { recursive: true });
  }
  return root;
}

test("deployargumenter bruger sikre standarder og kræver eksplicit første deployment", () => {
  const options = parseProductionDeployArgs([
    "--env-file",
    "secrets/.env.production",
    "--first-deploy",
    "--dry-run",
    "--timeout-seconds",
    "420",
  ]);
  assert.equal(options.envFile, "secrets/.env.production");
  assert.equal(options.firstDeploy, true);
  assert.equal(options.dryRun, true);
  assert.equal(options.timeoutSeconds, 420);
  assert.throws(() => parseProductionDeployArgs(["--ukendt"]), /Ukendt argument/);
});

test("rollbackargumenter adskiller deploymentrecord fra eksplicit dry-run revision", () => {
  const record = parseProductionRollbackArgs(["--record", "backups/deploy/deployment.json"]);
  assert.equal(record.record, "backups/deploy/deployment.json");
  const revision = parseProductionRollbackArgs(["--revision", "HEAD~1", "--dry-run"]);
  assert.equal(revision.revision, "HEAD~1");
  assert.equal(revision.dryRun, true);
});

test("Compose-kommandoer bruger den konkrete miljøfil og revisionslabel uden secrets", () => {
  const args = productionComposeArgs("C:/secrets/.env.production", "config", "--quiet");
  assert.deepEqual(args.slice(0, 5), [
    "compose",
    "--env-file",
    "C:/secrets/.env.production",
    "-f",
    resolve(repoRoot, "docker-compose.production.yml"),
  ]);
  const env = productionProcessEnv("C:/secrets/.env.production", "abc123", { TEST_ONLY: "yes" });
  assert.equal(env.DEPLOY_REVISION, "abc123");
  assert.equal(env.PRODUCTION_ENV_FILE, "C:/secrets/.env.production");
  assert.equal(deploymentRevisionLabel, "com.kinogrenaa.cinema-vagtplan.revision");
  assert.equal(args.join(" ").includes("POSTGRES_PASSWORD"), false);
});

test("migrationkompatibilitet omfatter både schema og migrationsmapper", () => {
  assert.deepEqual(changedMigrationPaths("README.md\nbackend/prisma/schema.prisma\nbackend/prisma/migrations/2026/migration.sql\n"), [
    "backend/prisma/schema.prisma",
    "backend/prisma/migrations/2026/migration.sql",
  ]);
  assert.deepEqual(changedMigrationPaths("frontend/app/page.tsx\n"), []);
});

test("deploymentrecord kræver revisionskæde og backupfelter uden secrets", () => {
  const record = validateDeploymentRecord({
    formatVersion: 1,
    createdAt: "2026-07-31T10:00:00.000Z",
    envFile: "C:/secrets/.env.production",
    previousRevision: "a".repeat(40),
    targetRevision: "b".repeat(40),
    backupDirectory: "C:/repo/backups/deploy/pre-deploy-backup",
  });
  assert.equal(record.targetRevision, "b".repeat(40));
  assert.throws(() => validateDeploymentRecord({ formatVersion: 2 }), /ukendt format/);
});

test("fælles argumentparser afviser ugyldig timeout", () => {
  assert.throws(() => parseCommonArguments(["--timeout-seconds", "0"]), /mellem 1 og 3600/);
  assert.throws(() => parseCommonArguments(["--timeout-seconds", "abc"]), /positivt heltal/);
});

test("den aktuelle repository-tilstand opfylder deploy- og rollbackkravene", () => {
  assert.deepEqual(collectProductionDeployProblems(repoRoot), []);
});

test("kontrollen afviser manglende verificeret backup og revisionslabel", () => {
  const root = copyRepositoryFixture();
  try {
    const deployPath = join(root, "scripts", "production-deploy.mjs");
    writeFileSync(
      deployPath,
      readFileSync(deployPath, "utf8").replace("verify-backup.mjs", "verify-disabled.mjs"),
      "utf8",
    );
    const composePath = join(root, "docker-compose.production.yml");
    writeFileSync(
      composePath,
      readFileSync(composePath, "utf8").replaceAll("com.kinogrenaa.cinema-vagtplan.revision", "revision-disabled"),
      "utf8",
    );
    const problems = collectProductionDeployProblems(root);
    assert.ok(problems.some((problem) => problem.includes("verify-backup.mjs")));
    assert.ok(problems.some((problem) => problem.includes("revision")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("kontrollen afviser automatisk database-restore og destruktiv volume-oprydning", () => {
  const root = copyRepositoryFixture();
  try {
    const rollbackPath = join(root, "scripts", "production-rollback.mjs");
    writeFileSync(
      rollbackPath,
      `${readFileSync(rollbackPath, "utf8")}\n// pg_restore\n// ["down", "-v"]\n`,
      "utf8",
    );
    const problems = collectProductionDeployProblems(root);
    assert.ok(problems.some((problem) => problem.includes("pg_restore")));
    assert.ok(problems.some((problem) => problem.includes('"down", "-v"')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
