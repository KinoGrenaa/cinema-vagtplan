import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");

function read(root, relativePath, problems) {
  const path = join(root, relativePath);
  if (!existsSync(path)) {
    problems.push(`Fil mangler: ${relativePath}`);
    return "";
  }
  return readFileSync(path, "utf8");
}

function requireText(content, marker, label, problems) {
  if (!content.includes(marker)) problems.push(`${label} mangler: ${marker}`);
}

export function collectProductionDeployProblems(root = repoRoot) {
  const problems = [];
  const packageText = read(root, "package.json", problems);
  const compose = read(root, "docker-compose.production.yml", problems);
  const deployLib = read(root, "scripts/production-deploy-lib.mjs", problems);
  const deploy = read(root, "scripts/production-deploy.mjs", problems);
  const rollback = read(root, "scripts/production-rollback.mjs", problems);
  const docs = read(root, "docs/production-deploy.md", problems);
  const deploymentDocs = read(root, "docs/production-deployment.md", problems);

  let packageJson = {};
  try {
    packageJson = JSON.parse(packageText);
  } catch {
    problems.push("package.json er ugyldigt JSON.");
  }
  const expectedScripts = {
    "check:production-deploy": "node ./scripts/check-production-deploy.mjs",
    "production:deploy": "node ./scripts/production-deploy.mjs",
    "production:rollback": "node ./scripts/production-rollback.mjs",
  };
  for (const [name, command] of Object.entries(expectedScripts)) {
    if (packageJson.scripts?.[name] !== command) {
      problems.push(`package.json mangler korrekt script: ${name}`);
    }
  }

  for (const marker of [
    "com.kinogrenaa.cinema-vagtplan.revision",
    "${DEPLOY_REVISION:-unmanaged}",
  ]) {
    requireText(compose, marker, "Production Compose", problems);
  }

  for (const marker of [
    "deploymentRevisionLabel",
    "getRunningDeploymentRevision",
    "assertApplicationRollbackCompatibility",
    "backend/prisma/schema.prisma",
    "backend/prisma/migrations",
    "waitForProductionServices",
    "smokeProductionOrigin",
    "/auth/login",
    "/socket.io/?EIO=4&transport=polling",
  ]) {
    requireText(deployLib, marker, "Production deploy-bibliotek", problems);
  }

  for (const marker of [
    "check-production-deploy.mjs",
    "production-preflight.mjs",
    "create-backup.mjs",
    "verify-backup.mjs",
    '"build", "migrate", "backend", "frontend"',
    '"up", "-d", "--remove-orphans"',
    "waitForProductionServices",
    "smokeProductionOrigin",
    "--first-deploy",
    "--dry-run",
    "Der udføres ikke automatisk rollback",
  ]) {
    requireText(deploy, marker, "Production deploy-script", problems);
  }

  for (const marker of [
    "check-production-deploy.mjs",
    "--record",
    "verifyExistingBackup",
    "assertApplicationRollbackCompatibility",
    '"worktree", "add", "--detach"',
    "before-rollback-backup",
    "rollback-labels.yml",
    "Database: ingen automatisk restore",
    "Databasen blev ikke gendannet automatisk",
  ]) {
    requireText(rollback, marker, "Production rollback-script", problems);
  }

  for (const forbidden of [
    '"down", "-v"',
    "pg_restore",
    "DROP DATABASE",
    "prisma migrate reset",
  ]) {
    if (deploy.includes(forbidden) || rollback.includes(forbidden)) {
      problems.push(`Deploy-/rollbackværktøjet indeholder en forbudt destruktiv markør: ${forbidden}`);
    }
  }

  for (const marker of [
    "production:deploy",
    "production:rollback",
    "pre-deploy-backup",
    "deployment.json",
    "Prisma",
    "--first-deploy",
    "--dry-run",
    "ingen automatisk database-restore",
  ]) {
    requireText(docs, marker, "Deploy-/rollbackdokumentation", problems);
  }
  requireText(deploymentDocs, "docs/production-deploy.md", "Produktionsdokumentation", problems);

  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = collectProductionDeployProblems();
  if (problems.length > 0) {
    console.error("Production deploy-kontrollen fejlede:\n");
    for (const problem of problems) console.error(`- ${problem}`);
    process.exit(1);
  }
  console.log("Production deploy-kontrol OK.");
  console.log("Deploy: preflight, verificeret backup, build, migration, health og smoke");
  console.log("Rollback: kun applikationskode ved identiske Prisma-migrationer");
  console.log("Database: aldrig automatisk restore eller destruktiv oprydning");
}
