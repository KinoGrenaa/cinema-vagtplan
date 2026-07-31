import { randomBytes } from "node:crypto";
import { join } from "node:path";
import {
  DATABASE_DUMP_NAME,
  UPLOADS_ARCHIVE_NAME,
  parseBackupArgument,
  runCommand,
  runCommandWithInputFile,
  uniqueRecoveryName,
} from "./recovery-lib.mjs";
import { verifyBackupDirectory } from "./verify-backup.mjs";

const parsed = (() => {
  try {
    return parseBackupArgument();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
})();

if (parsed.help) {
  console.log(`Brug: npm run backup:rehearse -- backups/<backupmappe>\n\nRehearsal opretter midlertidige Docker-volumes og en midlertidig PostgreSQL-container. Den aktive database og aktive uploads berøres ikke.`);
  process.exit(0);
}

const databaseContainer = uniqueRecoveryName("cinema-recovery-db");
const databaseVolume = uniqueRecoveryName("cinema-recovery-dbdata");
const uploadsVolume = uniqueRecoveryName("cinema-recovery-uploads");
const password = randomBytes(24).toString("hex");

function cleanup() {
  try {
    runCommand("docker", ["rm", "-f", databaseContainer]);
  } catch {}
  for (const volume of [databaseVolume, uploadsVolume]) {
    try {
      runCommand("docker", ["volume", "rm", "-f", volume]);
    } catch {}
  }
}

try {
  await verifyBackupDirectory(parsed.backupDirectory, { quiet: true });
  runCommand("docker", ["volume", "create", databaseVolume]);
  runCommand("docker", ["volume", "create", uploadsVolume]);
  runCommand("docker", [
    "run",
    "-d",
    "--name",
    databaseContainer,
    "-e",
    "POSTGRES_USER=recovery",
    "-e",
    `POSTGRES_PASSWORD=${password}`,
    "-e",
    "POSTGRES_DB=recovery",
    "-v",
    `${databaseVolume}:/var/lib/postgresql/data`,
    "postgres:16",
  ]);

  const deadline = Date.now() + 60_000;
  let ready = false;
  while (Date.now() < deadline) {
    const result = runCommand("docker", [
      "exec",
      databaseContainer,
      "pg_isready",
      "-U",
      "recovery",
      "-d",
      "recovery",
    ], { encoding: "utf8", allowFailure: true });
    if (result.status === 0) {
      ready = true;
      break;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000));
  }
  if (!ready) throw new Error("Den midlertidige PostgreSQL-container blev ikke klar.");

  runCommandWithInputFile(
    "docker",
    [
      "exec",
      "-i",
      databaseContainer,
      "pg_restore",
      "--exit-on-error",
      "--no-owner",
      "--no-acl",
      "-U",
      "recovery",
      "-d",
      "recovery",
    ],
    join(parsed.backupDirectory, DATABASE_DUMP_NAME),
  );

  const tableCountText = runCommand("docker", [
    "exec",
    databaseContainer,
    "psql",
    "-U",
    "recovery",
    "-d",
    "recovery",
    "-Atqc",
    "SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname='public';",
  ]).stdout.trim();
  const tableCount = Number(tableCountText);
  if (!Number.isInteger(tableCount) || tableCount <= 0) {
    throw new Error(`Restore gav ugyldigt antal public-tabeller: ${tableCountText}`);
  }

  const uploadCountText = runCommandWithInputFile(
    "docker",
    [
      "run",
      "--rm",
      "-i",
      "-v",
      `${uploadsVolume}:/restore`,
      "alpine:3.20",
      "sh",
      "-lc",
      "set -eu; cd /restore; tar -xzf -; find . -type f | wc -l",
    ],
    join(parsed.backupDirectory, UPLOADS_ARCHIVE_NAME),
  ).stdout.trim();
  const uploadCount = Number(uploadCountText);
  if (!Number.isInteger(uploadCount) || uploadCount < 0) {
    throw new Error(`Restore gav ugyldigt antal uploadfiler: ${uploadCountText}`);
  }

  console.log("Restore-rehearsal OK.");
  console.log(`Midlertidig database: ${tableCount} public-tabeller gendannet.`);
  console.log(`Midlertidigt uploadvolume: ${uploadCount} filer gendannet.`);
  console.log("Aktiv database og aktive uploads blev ikke ændret.");
} catch (error) {
  console.error(`Restore-rehearsal fejlede: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  cleanup();
}
