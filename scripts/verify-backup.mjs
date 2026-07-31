import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  DATABASE_DUMP_NAME,
  UPLOADS_ARCHIVE_NAME,
  parseBackupArgument,
  readManifest,
  runCommand,
  runCommandWithInputFile,
  sha256File,
  validateArchiveEntries,
} from "./recovery-lib.mjs";

export async function verifyBackupDirectory(backupDirectory, { quiet = false } = {}) {
  const manifest = readManifest(backupDirectory);
  const expectedNames = new Set([DATABASE_DUMP_NAME, UPLOADS_ARCHIVE_NAME]);
  const manifestByName = new Map(manifest.files.map((file) => [file.name, file]));

  for (const name of expectedNames) {
    const entry = manifestByName.get(name);
    if (!entry) throw new Error(`Manifest mangler ${name}.`);
    const path = join(backupDirectory, name);
    if (!existsSync(path) || !statSync(path).isFile()) {
      throw new Error(`Backupfil mangler: ${path}`);
    }
    const size = statSync(path).size;
    if (size !== entry.size) {
      throw new Error(`${name} har forkert størrelse: ${size}, forventede ${entry.size}.`);
    }
    const hash = await sha256File(path);
    if (hash !== entry.sha256) {
      throw new Error(`${name} har forkert SHA-256.`);
    }
  }

  runCommand("docker", ["version"]);
  const databaseListing = runCommandWithInputFile(
    "docker",
    ["run", "--rm", "-i", "postgres:16", "pg_restore", "--list"],
    join(backupDirectory, DATABASE_DUMP_NAME),
  ).stdout;
  if (!databaseListing.includes("TABLE") && !databaseListing.includes("SCHEMA")) {
    throw new Error("PostgreSQL-arkivet indeholder ingen genkendelige databaseobjekter.");
  }

  const uploadListing = runCommandWithInputFile(
    "docker",
    ["run", "--rm", "-i", "alpine:3.20", "tar", "-tzf", "-"],
    join(backupDirectory, UPLOADS_ARCHIVE_NAME),
  ).stdout;
  const uploadEntries = validateArchiveEntries(uploadListing);

  if (!quiet) {
    console.log("Backupverifikation OK.");
    console.log(`Databasearkiv: ${databaseListing.split(/\r?\n/).filter(Boolean).length} poster`);
    console.log(`Uploadarkiv: ${uploadEntries.length} poster`);
    console.log("SHA-256 og filstørrelser matcher manifestet.");
  }
  return { manifest, databaseListing, uploadEntries };
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  try {
    const parsed = parseBackupArgument();
    if (parsed.help) {
      console.log("Brug: npm run backup:verify -- backups/<backupmappe>");
      process.exit(0);
    }
    await verifyBackupDirectory(parsed.backupDirectory);
  } catch (error) {
    console.error(`Backupverifikation fejlede: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
