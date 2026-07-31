import { existsSync, rmSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  getGitRevision,
  getProductionStackState,
  getRunningDeploymentRevision,
  normalizeEnvFile,
  productionProcessEnv,
  repoRoot,
  runCommand,
  shortRevision,
  timestampForDeployment,
} from "./production-deploy-lib.mjs";
import { readManifest } from "./recovery-lib.mjs";
import { verifyBackupDirectory } from "./verify-backup.mjs";
import {
  OPERATIONAL_BACKUP_FORMAT_VERSION,
  OPERATIONAL_BACKUP_PREFIX,
  ensureBackupsChild,
  listOperationalBackups,
  parseProductionBackupArgs,
  planOperationalBackupRetention,
  readOperationalBackupMarker,
  writeOperationalBackupMarker,
} from "./production-operations-lib.mjs";

const backupsRoot = resolve(repoRoot, "backups");

function printHelp() {
  console.log(`Operationel production-backup\n\nBrug:\n  npm run production:backup -- --env-file .env.production\n  npm run production:backup -- --env-file .env.production --prune\n  npm run production:backup -- --mark-offsite backups/production-backup-... --offsite-reference <ufølsom reference>\n  npm run production:backup -- --prune-only --dry-run\n\nEn backup bliver først slettelig af retention, når den er verificeret og eksplicit markeret som kopieret off-host. Ukendte, ufuldstændige og lokale-only backups røres aldrig automatisk.`);
}

function assertSafeOffsiteReference(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  if (!normalized || normalized.length > 200 || /[\r\n]/.test(normalized)) {
    throw new Error("--offsite-reference skal være 1-200 tegn uden linjeskift.");
  }
  if (/password|secret|token|key=/i.test(normalized)) {
    throw new Error("--offsite-reference må ikke indeholde credentials eller secrets.");
  }
  return normalized;
}

function pruneOperationalBackups(options) {
  const backups = listOperationalBackups(backupsRoot);
  const plan = planOperationalBackupRetention(backups, options);
  console.log("\nRetentionplan");
  console.log(`Beholdes: ${plan.keep.length}`);
  console.log(`Beskyttet uden off-host-bekræftelse: ${plan.protectedUnconfirmed.length}`);
  console.log(`Kan slettes: ${plan.remove.length}`);
  for (const backup of plan.remove) {
    console.log(`${options.dryRun ? "VILLE SLETTE" : "SLETTER"}: ${relative(repoRoot, backup.directory)}`);
    if (!options.dryRun) {
      const safeDirectory = ensureBackupsChild(backup.directory, backupsRoot, { direct: true });
      if (!basename(safeDirectory).startsWith(OPERATIONAL_BACKUP_PREFIX)) {
        throw new Error(`Afviser usikker retentionsti: ${safeDirectory}`);
      }
      rmSync(safeDirectory, { recursive: true, force: false });
    }
  }
  if (options.dryRun) {
    console.log("Retention dry-run OK. Ingen mapper blev slettet.");
  } else {
    console.log("Retention OK. Kun verificerede og off-host-bekræftede operationelle backups blev vurderet.");
  }
  return plan;
}

async function markBackupOffsite(options) {
  const directory = ensureBackupsChild(options.markOffsite, backupsRoot, { direct: true });
  if (!basename(directory).startsWith(OPERATIONAL_BACKUP_PREFIX)) {
    throw new Error("Kun operationelle production-backups kan markeres off-host.");
  }
  const marker = readOperationalBackupMarker(directory);
  await verifyBackupDirectory(directory, { quiet: true });
  const offsiteReference = assertSafeOffsiteReference(options.offsiteReference);
  writeOperationalBackupMarker(directory, {
    ...marker,
    offsiteConfirmedAt: new Date().toISOString(),
    offsiteReference,
  });
  console.log("Off-host-bekræftelse registreret efter ny lokal backupverifikation.");
  console.log(`Backup: ${relative(repoRoot, directory)}`);
  console.log(`Reference: ${offsiteReference ?? "ingen ufølsom reference"}`);
}

async function createOperationalBackup(options) {
  const envFile = normalizeEnvFile(options.envFile);
  const revisionFallback = getGitRevision();
  const stackState = getProductionStackState(envFile, revisionFallback);
  if (!stackState.isComplete) {
    throw new Error(
      `Production-stacken er ikke komplet. Mangler: ${stackState.absent.join(", ") || "ukendt"}.`,
    );
  }
  const revision = getRunningDeploymentRevision(envFile, revisionFallback);
  if (!revision || revision === "unmanaged") {
    throw new Error("Production-stacken mangler en kendt deploymentrevision.");
  }

  const defaultName = `${OPERATIONAL_BACKUP_PREFIX}${timestampForDeployment()}-${shortRevision(revision)}`;
  const outputDirectory = ensureBackupsChild(
    options.output ? resolve(options.output) : join(backupsRoot, defaultName),
    backupsRoot,
    { direct: true },
  );
  if (!basename(outputDirectory).startsWith(OPERATIONAL_BACKUP_PREFIX)) {
    throw new Error(`Backupmappen skal starte med ${OPERATIONAL_BACKUP_PREFIX}.`);
  }
  if (existsSync(outputDirectory)) {
    throw new Error(`Backupmappen findes allerede: ${outputDirectory}`);
  }

  const composeEnvironment = productionProcessEnv(envFile, revision, {
    COMPOSE_FILE: resolve(repoRoot, "docker-compose.production.yml"),
    COMPOSE_ENV_FILES: envFile,
  });
  console.log("Opretter operationel production-backup...");
  runCommand(
    process.execPath,
    [resolve(repoRoot, "scripts", "create-backup.mjs"), "--output", outputDirectory],
    { env: composeEnvironment, inherit: true },
  );
  const verification = await verifyBackupDirectory(outputDirectory, { quiet: true });
  const manifest = readManifest(outputDirectory);
  writeOperationalBackupMarker(outputDirectory, {
    formatVersion: OPERATIONAL_BACKUP_FORMAT_VERSION,
    status: "verified",
    backupName: basename(outputDirectory),
    createdAt: manifest.createdAt,
    verifiedAt: new Date().toISOString(),
    revision,
    fileCount: manifest.files.length,
    totalBytes: manifest.files.reduce((sum, file) => sum + Number(file.size || 0), 0),
    databaseEntryCount: verification.databaseListing.split(/\r?\n/).filter(Boolean).length,
    uploadEntryCount: verification.uploadEntries.length,
    offsiteConfirmedAt: null,
    offsiteReference: null,
  });
  console.log("Operationel production-backup OK.");
  console.log(`Backup: ${relative(repoRoot, outputDirectory)}`);
  console.log(`Revision: ${revision}`);
  console.log("Status: lokalt verificeret; kopier nu krypteret off-host og registrér bekræftelsen.");
  return outputDirectory;
}

export async function runProductionBackup(args = process.argv.slice(2)) {
  try {
    const options = parseProductionBackupArgs(args);
    if (options.help) {
      printHelp();
      return 0;
    }
    if (options.markOffsite) {
      await markBackupOffsite(options);
      return 0;
    }
    if (options.pruneOnly) {
      pruneOperationalBackups(options);
      return 0;
    }
    await createOperationalBackup(options);
    if (options.prune) {
      pruneOperationalBackups(options);
    }
    return 0;
  } catch (error) {
    console.error(`Operationel production-backup fejlede: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runProductionBackup();
}
