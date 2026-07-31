import { existsSync, mkdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  assertCleanWorkingTree,
  getGitRevision,
  getProductionStackState,
  getRunningDeploymentRevision,
  normalizeEnvFile,
  parseCommonArguments,
  productionComposeArgs,
  productionProcessEnv,
  repoRoot,
  runCommand,
  shortRevision,
  smokeProductionOrigin,
  timestampForDeployment,
  waitForProductionServices,
  writeDeploymentRecord,
} from "./production-deploy-lib.mjs";

export function parseProductionDeployArgs(args) {
  return parseCommonArguments(args, {
    allowed: ["--first-deploy"],
    definitions: {
      "--first-deploy": { type: "boolean", key: "firstDeploy" },
    },
  });
}

function printHelp() {
  console.log(`Kontrolleret production-deployment\n\nBrug:\n  npm run production:deploy -- --env-file .env.production\n  npm run production:deploy -- --env-file .env.production --first-deploy\n  npm run production:deploy -- --env-file .env.production --dry-run --first-deploy\n\nEt normalt deployment kræver en kørende komplet production-stack, opretter og verificerer backup, bygger images, kører migration, venter på healthchecks og tester frontend/API/Socket.IO. --first-deploy må kun bruges, når production-stacken er helt fraværende.`);
}

function createBackup(backupDirectory, envFile, revision) {
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

export async function runProductionDeploy(args = process.argv.slice(2)) {
  let options;
  try {
    options = parseProductionDeployArgs(args);
    if (options.help) {
      printHelp();
      return 0;
    }
    options.envFile = normalizeEnvFile(options.envFile);
    assertCleanWorkingTree(options.allowDirty);

    const targetRevision = getGitRevision();
    const targetShort = shortRevision(targetRevision);
    const stackState = getProductionStackState(options.envFile, targetRevision);
    if (!stackState.isAbsent && !stackState.isComplete) {
      throw new Error(`Production-stacken er delvist til stede (${stackState.present.join(", ")}). Ret tilstanden manuelt før deployment.`);
    }
    if (stackState.isAbsent && !options.firstDeploy) {
      throw new Error("Production-stacken findes ikke. Brug kun --first-deploy efter verificeret cutoverplan og recovery-rehearsal.");
    }
    if (stackState.isComplete && options.firstDeploy) {
      throw new Error("--first-deploy må ikke bruges, når production-stacken allerede findes.");
    }

    const previousRevision = stackState.isComplete
      ? getRunningDeploymentRevision(options.envFile, targetRevision)
      : null;
    const timestamp = timestampForDeployment();
    const deploymentDirectory = resolve(repoRoot, "backups", `production-deploy-${timestamp}-${targetShort}`);
    const backupDirectory = stackState.isComplete ? join(deploymentDirectory, "pre-deploy-backup") : null;
    const recordPath = join(deploymentDirectory, "deployment.json");

    runCommand(process.execPath, [resolve(repoRoot, "scripts", "check-production-deploy.mjs")], { inherit: true });

    const preflightArgs = [
      resolve(repoRoot, "scripts", "production-preflight.mjs"),
      "--env-file",
      options.envFile,
    ];
    if (options.allowHttp) preflightArgs.push("--allow-http");
    if (options.allowDirty) preflightArgs.push("--allow-dirty");
    runCommand(process.execPath, preflightArgs, { inherit: true });

    const plan = {
      formatVersion: 1,
      createdAt: new Date().toISOString(),
      status: options.dryRun ? "dry-run" : "prepared",
      envFile: options.envFile,
      previousRevision,
      targetRevision,
      backupDirectory,
      firstDeploy: stackState.isAbsent,
    };

    console.log("\nDeploymentplan");
    console.log(`Fra revision: ${previousRevision ?? "ingen eksisterende deployment"}`);
    console.log(`Til revision: ${targetRevision}`);
    console.log(`Backup: ${backupDirectory ?? "ingen live-data ved første deployment"}`);
    console.log(`Timeout: ${options.timeoutSeconds} sekunder`);

    if (options.dryRun) {
      console.log("Production-deploy dry-run OK.");
      console.log("Preflight og deploymentplan er valideret; ingen backup, build, migration eller serviceændring blev udført.");
      return 0;
    }

    mkdirSync(deploymentDirectory, { recursive: true });
    writeDeploymentRecord(recordPath, plan);

    if (backupDirectory) {
      console.log("\nOpretter og verificerer pre-deploy-backup...");
      createBackup(backupDirectory, options.envFile, targetRevision);
    }

    const composeEnvironment = productionProcessEnv(options.envFile, targetRevision);
    console.log("\nBygger production-images...");
    runCommand("docker", productionComposeArgs(options.envFile, "build", "migrate", "backend", "frontend"), {
      env: composeEnvironment,
      inherit: true,
    });

    console.log("\nOpdaterer production-stacken...");
    runCommand("docker", productionComposeArgs(options.envFile, "up", "-d", "--remove-orphans"), {
      env: composeEnvironment,
      inherit: true,
    });

    const serviceStatus = await waitForProductionServices(
      options.envFile,
      targetRevision,
      options.timeoutSeconds,
    );
    const smoke = await smokeProductionOrigin(options.envFile);

    writeDeploymentRecord(recordPath, {
      ...plan,
      status: "deployed",
      deployedAt: new Date().toISOString(),
      serviceStatus,
      smoke,
    });

    console.log("\nProduction-deployment OK.");
    console.log(`Revision: ${targetRevision}`);
    console.log(`Services: ${serviceStatus}`);
    console.log(`Smoke: frontend ${smoke.rootStatus}, API ${smoke.loginStatus}, Socket.IO ${smoke.socketStatus}`);
    console.log(`Deploymentrecord: ${relative(repoRoot, recordPath)}`);
    if (previousRevision && previousRevision !== "unmanaged") {
      console.log(`Rollback ved behov: npm run production:rollback -- --env-file "${options.envFile}" --record "${recordPath}"`);
    } else {
      console.log("Automatisk applikationsrollback er ikke mulig, fordi den tidligere revision ikke er kendt.");
    }
    return 0;
  } catch (error) {
    console.error(`Production-deployment fejlede: ${error instanceof Error ? error.message : String(error)}`);
    console.error("Der udføres ikke automatisk rollback. Bevar backup og logs, og vurder databasekompatibilitet først.");
    return 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runProductionDeploy();
}
