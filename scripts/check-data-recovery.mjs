import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const defaultRoot = resolve(import.meta.dirname, "..");

function read(root, path, errors) {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) {
    errors.push(`Fil mangler: ${path}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireText(content, marker, label, errors) {
  if (!content.includes(marker)) errors.push(`${label} mangler: ${marker}`);
}

export function collectDataRecoveryErrors(root = defaultRoot) {
  const errors = [];
  const packageJsonText = read(root, "package.json", errors);
  const gitignore = read(root, ".gitignore", errors);
  const createBackup = read(root, "scripts/create-backup.mjs", errors);
  const verifyBackup = read(root, "scripts/verify-backup.mjs", errors);
  const rehearseRestore = read(root, "scripts/rehearse-restore.mjs", errors);
  const recoveryLib = read(root, "scripts/recovery-lib.mjs", errors);
  const docs = read(root, "docs/data-recovery.md", errors);

  let packageJson = {};
  try {
    packageJson = JSON.parse(packageJsonText);
  } catch {
    errors.push("package.json er ugyldigt JSON.");
  }
  const scripts = packageJson.scripts ?? {};
  const requiredScripts = {
    "check:data-recovery": "node ./scripts/check-data-recovery.mjs",
    "backup:create": "node ./scripts/create-backup.mjs",
    "backup:verify": "node ./scripts/verify-backup.mjs",
    "backup:rehearse": "node ./scripts/rehearse-restore.mjs",
  };
  for (const [name, command] of Object.entries(requiredScripts)) {
    if (scripts[name] !== command) errors.push(`package.json mangler korrekt script: ${name}`);
  }

  if (!gitignore.split(/\r?\n/).includes("backups")) {
    errors.push(".gitignore mangler backups.");
  }

  requireText(createBackup, "pg_dump --format=custom", "Databasebackup", errors);
  requireText(createBackup, "tar -czf - -C /app/uploads", "Uploadbackup", errors);
  requireText(createBackup, "describeFile", "Backupmanifest", errors);
  requireText(createBackup, "createdOutputDirectory", "Sikker fejloprydning", errors);
  requireText(recoveryLib, 'createHash("sha256")', "SHA-256-kontrol", errors);
  requireText(verifyBackup, '"pg_restore", "--list"', "Databasearkivkontrol", errors);
  requireText(verifyBackup, '"tar", "-tzf", "-"', "Uploadarkivkontrol", errors);
  requireText(verifyBackup, "validateArchiveEntries", "Arkivsti-kontrol", errors);
  requireText(rehearseRestore, '"postgres:16"', "Midlertidig restore-database", errors);
  requireText(rehearseRestore, '"volume", "create"', "Midlertidige volumes", errors);
  requireText(rehearseRestore, '"pg_restore"', "Database-restore", errors);
  requireText(rehearseRestore, "allowFailure: true", "Readiness-polling", errors);
  requireText(rehearseRestore, '"volume", "rm", "-f"', "Oprydning af volumes", errors);
  requireText(rehearseRestore, '"rm", "-f", databaseContainer', "Oprydning af container", errors);

  for (const forbidden of ["docker compose down -v", "DROP DATABASE", "TRUNCATE "]) {
    if (`${createBackup}\n${verifyBackup}\n${rehearseRestore}`.includes(forbidden)) {
      errors.push(`Recovery-scripts indeholder farlig live-kommando: ${forbidden}`);
    }
  }

  for (const marker of [
    "off-host",
    "krypter",
    "retention",
    "RPO",
    "RTO",
    "restore-rehearsal",
    "/app/uploads",
  ]) {
    requireText(docs, marker, "Recovery-dokumentation", errors);
  }
  return errors;
}

if (import.meta.filename === process.argv[1]) {
  const errors = collectDataRecoveryErrors();
  if (errors.length) {
    console.error("Datagendannelseskontrollen fejlede:\n");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log("Datagendannelseskontrol OK.");
  console.log("Backup: PostgreSQL + /app/uploads + SHA-256-manifest");
  console.log("Verifikation: arkivintegritet og sikre uploadstier");
  console.log("Restore: isoleret rehearsal i midlertidige Docker-volumes");
}
