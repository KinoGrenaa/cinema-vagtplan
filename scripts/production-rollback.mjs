import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  assertApplicationRollbackCompatibility,
  assertCleanWorkingTree,
  getGitRevision,
  getProductionStackState,
  getRunningDeploymentRevision,
  normalizeEnvFile,
  parseCommonArguments,
  productionProcessEnv,
  readDeploymentRecord,
  repoRoot,
  runCommand,
  shortRevision,
  smokeProductionOrigin,
  timestampForDeployment,
  waitForProductionServices,
} from "./production-deploy-lib.mjs";

export function parseProductionRollbackArgs(args) {
  return parseCommonArguments(args, {
    allowed: ["--record", "--revision"],
    definitions: {
      "--record": { type: "value", key: "record" },
      "--revision": { type: "value", key: "revision" },
    },
  });
}

function printHelp() {
  console.log(`Kontrolleret applikationsrollback\n\nBrug:\n  npm run production:rollback -- --env-file .env.production --record backups/production-deploy-.../deployment.json\n  npm run production:rollback -- --env-file .env.production --revision <git-sha> --dry-run\n\nEn rigtig rollback kræver deploymentrecord, verificeret pre-deploy-backup og identiske Prisma-migrationer mellem den aktuelle og tidligere revision. Scriptet ruller kun applikationskode tilbage og gendanner aldrig databasen automatisk.`);
}

function createAndVerifyBackup(backupDirectory, envFile, revision) {
  const composeEnvironment = productionProcessEnv(envFile, revision, {
    COMPOSE_FILE: resolve(repoRoot, "docker-compose.production.yml"),
    COMPOSE_ENV_FILES: envFile,
  });
  runCommand(process.execPath, [
    resolve(repoRoot, "scripts", "create-backup.mjs"),
    "--output",
    backupDirectory,
  ], { env: composeEnvironment, inherit: true });
  runCommand(process.execPath, [
    resolve(repoRoot, "scripts", "verify-backup.mjs"),
    backupDirectory,
  ], { env: composeEnvironment, inherit: true });
}

function verifyExistingBackup(backupDirectory, envFile, revision) {
  if (!backupDirectory || !existsSync(backupDirectory)) {
    throw new Error("Deploymentrecordets pre-deploy-backup mangler.");
  }
  runCommand(process.execPath, [
    resolve(repoRoot, "scripts", "verify-backup.mjs"),
    backupDirectory,
  ], {
    env: productionProcessEnv(envFile, revision),
    inherit: true,
  });
}

export async function runProductionRollback(args = process.argv.slice(2)) {
  let worktreeDirectory = null;
  let rollbackSucceeded = false;
  try {
    const options = parseProductionRollbackArgs(args);
    if (options.help) {
      printHelp();
      return 0;
    }
    options.envFile = normalizeEnvFile(options.envFile);
    assertCleanWorkingTree(options.allowDirty);
    if (options.record && options.revision) throw new Error("Brug enten --record eller --revision, ikke begge.");
    if (!options.record && !options.revision) throw new Error("Angiv --record. --revision er kun tilladt sammen med --dry-run.");
    if (!options.dryRun && !options.record) {
      throw new Error("En rigtig rollback kræver --record, så backup og revisionskæde kan verificeres.");
    }

    const record = options.record ? readDeploymentRecord(options.record) : null;
    const targetRevision = getGitRevision(repoRoot, record?.previousRevision ?? options.revision);
    const stackState = getProductionStackState(options.envFile, targetRevision);
    if (!stackState.isComplete) {
      throw new Error(`Production-stacken er ikke komplet. Tilstede: ${stackState.present.join(", ") || "ingen"}.`);
    }
    const currentRevision = getRunningDeploymentRevision(options.envFile, targetRevision);
    if (!currentRevision || currentRevision === "unmanaged") {
      if (!options.dryRun) throw new Error("Den kørende production-revision er ukendt; automatisk rollback er blokeret.");
    }
    const comparisonRevision = currentRevision && currentRevision !== "unmanaged"
      ? getGitRevision(repoRoot, currentRevision)
      : getGitRevision();

    if (record) {
      const expectedCurrent = getGitRevision(repoRoot, record.targetRevision);
      if (comparisonRevision !== expectedCurrent) {
        throw new Error("Deploymentrecordet matcher ikke den kørende production-revision. Brug recordet fra det aktuelle deployment.");
      }
      verifyExistingBackup(record.backupDirectory, options.envFile, comparisonRevision);
    }

    assertApplicationRollbackCompatibility(targetRevision, comparisonRevision);

    runCommand(process.execPath, [resolve(repoRoot, "scripts", "check-production-deploy.mjs")], { inherit: true });

    const preflightArgs = [
      resolve(repoRoot, "scripts", "production-preflight.mjs"),
      "--env-file",
      options.envFile,
    ];
    if (options.allowHttp) preflightArgs.push("--allow-http");
    if (options.allowDirty) preflightArgs.push("--allow-dirty");
    runCommand(process.execPath, preflightArgs, { inherit: true });

    console.log("\nRollbackplan");
    console.log(`Fra revision: ${comparisonRevision}`);
    console.log(`Til revision: ${targetRevision}`);
    console.log("Database: ingen automatisk restore; Prisma-schema og migrationer er identiske.");
    if (record?.backupDirectory) console.log(`Verificeret pre-deploy-backup: ${record.backupDirectory}`);

    if (options.dryRun) {
      console.log("Production-rollback dry-run OK.");
      console.log("Revisionskæde, backup og databasekompatibilitet er valideret; ingen services blev ændret.");
      return 0;
    }

    const timestamp = timestampForDeployment();
    const rollbackDirectory = resolve(
      repoRoot,
      "backups",
      `production-rollback-${timestamp}-${shortRevision(targetRevision)}`,
    );
    const beforeRollbackBackup = join(rollbackDirectory, "before-rollback-backup");
    const rollbackRecordPath = join(rollbackDirectory, "rollback.json");
    mkdirSync(rollbackDirectory, { recursive: true });

    console.log("\nOpretter og verificerer backup af den aktuelle production-tilstand...");
    createAndVerifyBackup(beforeRollbackBackup, options.envFile, comparisonRevision);

    worktreeDirectory = join(rollbackDirectory, "target-worktree");
    runCommand("git", ["worktree", "add", "--detach", worktreeDirectory, targetRevision], { inherit: true });
    const targetCompose = join(worktreeDirectory, "docker-compose.production.yml");
    if (!existsSync(targetCompose)) throw new Error("Rollbackrevisionen indeholder ikke docker-compose.production.yml.");
    if (!existsSync(join(worktreeDirectory, "deploy", "Caddyfile"))) {
      throw new Error("Rollbackrevisionen indeholder ikke deploy/Caddyfile.");
    }
    const labelOverride = join(rollbackDirectory, "rollback-labels.yml");
    writeFileSync(
      labelOverride,
      [
        "services:",
        ...["database", "migrate", "backend", "frontend", "proxy"].flatMap((service) => [
          `  ${service}:`,
          "    labels:",
          "      com.kinogrenaa.cinema-vagtplan.revision: ${DEPLOY_REVISION}",
        ]),
        "",
      ].join("\n"),
      "utf8",
    );

    const composeArgs = (...composeArgs) => [
      "compose",
      "--env-file",
      options.envFile,
      "-f",
      targetCompose,
      "-f",
      labelOverride,
      ...composeArgs,
    ];
    const composeEnvironment = productionProcessEnv(options.envFile, targetRevision);
    runCommand("docker", composeArgs("config", "--quiet"), {
      cwd: worktreeDirectory,
      env: composeEnvironment,
    });
    console.log("\nBygger rollbackrevisionens production-images...");
    runCommand("docker", composeArgs("build", "migrate", "backend", "frontend"), {
      cwd: worktreeDirectory,
      env: composeEnvironment,
      inherit: true,
    });
    console.log("\nAktiverer rollbackrevisionen...");
    runCommand("docker", composeArgs("up", "-d", "--remove-orphans"), {
      cwd: worktreeDirectory,
      env: composeEnvironment,
      inherit: true,
    });

    const serviceStatus = await waitForProductionServices(
      options.envFile,
      targetRevision,
      options.timeoutSeconds,
    );
    const smoke = await smokeProductionOrigin(options.envFile);
    writeFileSync(rollbackRecordPath, `${JSON.stringify({
      formatVersion: 1,
      rolledBackAt: new Date().toISOString(),
      fromRevision: comparisonRevision,
      toRevision: targetRevision,
      sourceDeploymentRecord: options.record,
      preDeployBackup: record?.backupDirectory ?? null,
      beforeRollbackBackup,
      serviceStatus,
      smoke,
      retainedWorktree: worktreeDirectory,
    }, null, 2)}\n`, "utf8");

    console.log("\nProduction-rollback OK.");
    console.log(`Revision: ${targetRevision}`);
    console.log(`Services: ${serviceStatus}`);
    console.log(`Smoke: frontend ${smoke.rootStatus}, API ${smoke.loginStatus}, Socket.IO ${smoke.socketStatus}`);
    console.log(`Rollbackrecord: ${relative(repoRoot, rollbackRecordPath)}`);
    console.log(`Aktiv rollback-kilde bevares i: ${relative(repoRoot, worktreeDirectory)}`);
    console.log("Fjern først worktree-mappen efter et senere vellykket deployment har erstattet rollbackversionen.");
    rollbackSucceeded = true;
    return 0;
  } catch (error) {
    console.error(`Production-rollback fejlede: ${error instanceof Error ? error.message : String(error)}`);
    console.error("Databasen blev ikke gendannet automatisk. Bevar begge verificerede backups og logs.");
    return 1;
  } finally {
    if (!rollbackSucceeded && worktreeDirectory && existsSync(worktreeDirectory)) {
      runCommand("git", ["worktree", "remove", "--force", worktreeDirectory], { allowFailure: true });
      rmSync(worktreeDirectory, { recursive: true, force: true });
      runCommand("git", ["worktree", "prune"], { allowFailure: true });
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runProductionRollback();
}
