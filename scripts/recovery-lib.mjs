import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  createReadStream,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

export const repoRoot = resolve(import.meta.dirname, "..");
export const BACKUP_FORMAT_VERSION = 1;
export const DATABASE_DUMP_NAME = "database.dump";
export const UPLOADS_ARCHIVE_NAME = "uploads.tar.gz";
export const MANIFEST_NAME = "manifest.json";

export function timestampForPath(date = new Date()) {
  return date.toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
}

export function ensureInsideRepo(path) {
  const resolved = resolve(path);
  const relativePath = relative(repoRoot, resolved);
  if (
    relativePath === "" ||
    relativePath === "." ||
    relativePath.startsWith(`..${sep}`) ||
    relativePath === ".." ||
    isAbsolute(relativePath)
  ) {
    throw new Error("Backupstien skal ligge i en undermappe under repository-roden.");
  }
  return resolved;
}

export function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: options.env ?? process.env,
    encoding: options.encoding ?? "utf8",
    input: options.input,
    stdio: options.stdio ?? "pipe",
    maxBuffer: options.maxBuffer ?? 32 * 1024 * 1024,
  });

  if (result.error) {
    throw new Error(`Kunne ikke starte ${command}: ${result.error.message}`);
  }
  if (result.status !== 0 && !options.allowFailure) {
    const stderr =
      typeof result.stderr === "string"
        ? result.stderr.trim()
        : Buffer.isBuffer(result.stderr)
          ? result.stderr.toString("utf8").trim()
          : "";
    throw new Error(
      `${command} ${args.join(" ")} fejlede med exitkode ${result.status}${
        stderr ? `: ${stderr}` : ""
      }`,
    );
  }
  return result;
}

export function runCommandToFile(command, args, outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  const outputFd = openSync(outputPath, "wx");
  try {
    runCommand(command, args, {
      stdio: ["ignore", outputFd, "pipe"],
      encoding: "utf8",
    });
  } catch (error) {
    rmSync(outputPath, { force: true });
    throw error;
  } finally {
    closeSync(outputFd);
  }
}

export function runCommandWithInputFile(command, args, inputPath) {
  const inputFd = openSync(inputPath, "r");
  try {
    return runCommand(command, args, {
      stdio: [inputFd, "pipe", "pipe"],
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } finally {
    closeSync(inputFd);
  }
}

export async function sha256File(path) {
  const hash = createHash("sha256");
  await new Promise((resolvePromise, rejectPromise) => {
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", rejectPromise);
    stream.on("end", resolvePromise);
  });
  return hash.digest("hex");
}

export async function describeFile(path) {
  const stats = statSync(path);
  if (!stats.isFile() || stats.size <= 0) {
    throw new Error(`Backupfilen er tom eller mangler: ${path}`);
  }
  return {
    name: path.split(/[\\/]/).at(-1),
    size: stats.size,
    sha256: await sha256File(path),
  };
}

export function readManifest(backupDirectory) {
  const path = join(backupDirectory, MANIFEST_NAME);
  if (!existsSync(path)) {
    throw new Error(`Manifest mangler: ${path}`);
  }
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Manifest er ugyldigt JSON: ${error.message}`);
  }
  if (manifest?.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new Error(
      `Ukendt backupformat: ${String(manifest?.formatVersion ?? "mangler")}`,
    );
  }
  if (!Array.isArray(manifest.files)) {
    throw new Error("Manifestets filliste mangler.");
  }
  return manifest;
}

export function writeManifest(backupDirectory, manifest) {
  writeFileSync(
    join(backupDirectory, MANIFEST_NAME),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
}

export function parseBackupArgument(args = process.argv.slice(2)) {
  if (args.includes("--help")) return { help: true };
  if (args.length === 0) {
    throw new Error("Angiv backupmappen som første argument.");
  }
  if (args.length > 1) {
    throw new Error(`Ukendte argumenter: ${args.slice(1).join(", ")}`);
  }
  return { help: false, backupDirectory: resolve(args[0]) };
}

export function validateArchiveEntries(lines) {
  const entries = lines
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const entry of entries) {
    const normalized = entry.replaceAll("\\", "/");
    const segments = normalized.split("/").filter(Boolean);
    if (
      normalized.startsWith("/") ||
      /^[A-Za-z]:\//.test(normalized) ||
      segments.includes("..")
    ) {
      throw new Error(`Uploadarkivet indeholder en usikker sti: ${entry}`);
    }
  }
  return entries;
}

export function uniqueRecoveryName(prefix) {
  return `${prefix}-${Date.now()}-${randomBytes(4).toString("hex")}`;
}
