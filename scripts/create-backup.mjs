import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  BACKUP_FORMAT_VERSION,
  DATABASE_DUMP_NAME,
  MANIFEST_NAME,
  UPLOADS_ARCHIVE_NAME,
  describeFile,
  ensureInsideRepo,
  repoRoot,
  runCommand,
  runCommandToFile,
  timestampForPath,
  writeManifest,
} from "./recovery-lib.mjs";

const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(`Opret datagendannelsesbackup\n\nBrug:\n  npm run backup:create\n  npm run backup:create -- --output backups/min-backup\n\nBackupen indeholder PostgreSQL-dump, alle filer fra /app/uploads og et SHA-256-manifest.`);
  process.exit(0);
}

let outputDirectory = resolve(repoRoot, "backups", timestampForPath());
let createdOutputDirectory = false;
if (args.length > 0) {
  if (args.length !== 2 || args[0] !== "--output") {
    console.error(`Ukendte argumenter: ${args.join(" ")}`);
    process.exit(2);
  }
  outputDirectory = resolve(args[1]);
}

try {
  outputDirectory = ensureInsideRepo(outputDirectory);
  if (existsSync(outputDirectory)) {
    throw new Error(`Backupmappen findes allerede: ${outputDirectory}`);
  }
  mkdirSync(outputDirectory, { recursive: true });
  createdOutputDirectory = true;

  runCommand("docker", ["compose", "version"]);
  const running = runCommand("docker", [
    "compose",
    "ps",
    "--status",
    "running",
    "--services",
  ]).stdout;
  const services = new Set(running.split(/\r?\n/).filter(Boolean));
  for (const required of ["database", "backend"]) {
    if (!services.has(required)) {
      throw new Error(`Docker Compose-servicen ${required} kører ikke.`);
    }
  }

  const databasePath = join(outputDirectory, DATABASE_DUMP_NAME);
  const uploadsPath = join(outputDirectory, UPLOADS_ARCHIVE_NAME);

  console.log("Opretter PostgreSQL-backup...");
  runCommandToFile(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "database",
      "sh",
      "-lc",
      'exec pg_dump --format=custom --compress=6 --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB"',
    ],
    databasePath,
  );

  console.log("Opretter backup af /app/uploads...");
  runCommandToFile(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "backend",
      "sh",
      "-lc",
      "if [ -d /app/uploads ]; then exec tar -czf - -C /app/uploads .; else mkdir -p /tmp/empty-uploads && exec tar -czf - -C /tmp/empty-uploads .; fi",
    ],
    uploadsPath,
  );

  const files = await Promise.all([
    describeFile(databasePath),
    describeFile(uploadsPath),
  ]);
  writeManifest(outputDirectory, {
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAt: new Date().toISOString(),
    source: {
      databaseService: "database",
      uploadsService: "backend",
      uploadsPath: "/app/uploads",
    },
    files,
  });

  console.log(`Backup oprettet: ${outputDirectory}`);
  console.log(`Manifest: ${join(outputDirectory, MANIFEST_NAME)}`);
  console.log("Kør nu: npm run backup:verify -- \"<backupmappe>\"");
} catch (error) {
  if (createdOutputDirectory && existsSync(outputDirectory)) {
    rmSync(outputDirectory, { recursive: true, force: true });
  }
  console.error(`Backup fejlede: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
