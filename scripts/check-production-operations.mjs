import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const repoRoot = resolve(import.meta.dirname, "..");

function read(root, path) {
  return readFileSync(join(root, path), "utf8");
}

export function collectProductionOperationsProblems(root = repoRoot) {
  const problems = [];
  const packageJson = JSON.parse(read(root, "package.json"));
  const scripts = packageJson.scripts ?? {};
  for (const [name, command] of [
    ["check:production-operations", "node ./scripts/check-production-operations.mjs"],
    ["production:monitor", "node ./scripts/production-monitor.mjs"],
    ["production:backup", "node ./scripts/production-backup.mjs"],
  ]) {
    if (scripts[name] !== command) problems.push(`package.json mangler korrekt ${name}.`);
  }

  const monitor = read(root, "scripts/production-monitor.mjs");
  for (const marker of [
    "serviceSummary",
    "migrationSummary",
    "socket.io",
    "latestOperationalBackupStatus",
    "maxOffsiteAgeHours",
    "deploymentRevisionLabel",
  ]) {
    if (!monitor.includes(marker)) problems.push(`Production-monitor mangler: ${marker}`);
  }

  const backup = read(root, "scripts/production-backup.mjs");
  for (const marker of [
    "create-backup.mjs",
    "verifyBackupDirectory",
    "offsiteConfirmedAt",
    "planOperationalBackupRetention",
    "--prune-only",
    "--mark-offsite",
  ]) {
    if (!backup.includes(marker)) problems.push(`Production-backup mangler: ${marker}`);
  }
  for (const forbidden of ["down -v", "migrate reset", "pg_restore --clean", "docker volume rm"]) {
    if (backup.toLowerCase().includes(forbidden.toLowerCase())) {
      problems.push(`Production-backup indeholder destruktiv kommando: ${forbidden}`);
    }
  }

  const library = read(root, "scripts/production-operations-lib.mjs");
  for (const marker of [
    "protectedUnconfirmed",
    "OPERATIONAL_BACKUP_PREFIX",
    "offsiteConfirmedAt",
    "keepDaily",
    "keepWeekly",
    "keepMonthly",
  ]) {
    if (!library.includes(marker)) problems.push(`Operationsbibliotek mangler: ${marker}`);
  }

  const docs = read(root, "docs/production-operations.md");
  for (const marker of [
    "hver 5. minut",
    "02:30",
    "7 daglige",
    "4 ugentlige",
    "12 månedlige",
    "off-host",
    "krypteret",
    "exitkode 1",
  ]) {
    if (!docs.toLowerCase().includes(marker.toLowerCase())) {
      problems.push(`Operationsdokumentation mangler: ${marker}`);
    }
  }

  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const problems = collectProductionOperationsProblems();
    if (problems.length > 0) {
      console.error("Production operations-kontrol fejlede:");
      for (const problem of problems) console.error(`- ${problem}`);
      process.exit(1);
    }
    console.log("Production operations-kontrol OK.");
    console.log("Monitor: service-health, revision, migration, HTTP/API/Socket.IO og backupfriskhed");
    console.log("Backup: verificeret lokal kopi, eksplicit off-host-bekræftelse og sikker retention");
    console.log("Sletning: kun kendte, verificerede og off-host-bekræftede operationelle backups");
  } catch (error) {
    console.error(`Production operations-kontrol fejlede: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
