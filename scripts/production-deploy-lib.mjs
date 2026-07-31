import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { readProductionEnvFile } from "./production-env-lib.mjs";

export const repoRoot = resolve(import.meta.dirname, "..");
export const productionComposeFile = join(repoRoot, "docker-compose.production.yml");
export const deploymentRevisionLabel = "com.kinogrenaa.cinema-vagtplan.revision";

export function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: options.env ?? process.env,
    encoding: "utf8",
    stdio: options.inherit ? "inherit" : "pipe",
    maxBuffer: options.maxBuffer ?? 64 * 1024 * 1024,
  });
  if (result.error) throw new Error(`Kunne ikke starte ${command}: ${result.error.message}`);
  if (result.status !== 0 && !options.allowFailure) {
    const detail = String(result.stderr || result.stdout || "").trim();
    throw new Error(
      `${command} ${args.join(" ")} fejlede med exitkode ${result.status}${detail ? `: ${detail}` : ""}`,
    );
  }
  return result;
}

export function normalizeEnvFile(path) {
  const absolutePath = resolve(path || ".env.production");
  if (!existsSync(absolutePath)) throw new Error(`Produktionsmiljøfilen mangler: ${absolutePath}`);
  return absolutePath;
}

export function productionComposeArgs(envFile, ...args) {
  return ["compose", "--env-file", envFile, "-f", productionComposeFile, ...args];
}

export function productionProcessEnv(envFile, revision, extra = {}) {
  return {
    ...process.env,
    PRODUCTION_ENV_FILE: envFile.replaceAll("\\", "/"),
    DEPLOY_REVISION: revision,
    ...extra,
  };
}

export function getGitRevision(cwd = repoRoot, revision = "HEAD") {
  return runCommand("git", ["rev-parse", "--verify", `${revision}^{commit}`], { cwd }).stdout.trim();
}

export function shortRevision(revision) {
  return String(revision).slice(0, 12);
}

export function timestampForDeployment(date = new Date()) {
  return date.toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
}

export function ensureBackupPath(path) {
  const absolutePath = resolve(path);
  const backupsRoot = resolve(repoRoot, "backups");
  const relativePath = relative(backupsRoot, absolutePath);
  if (
    relativePath === "" ||
    relativePath === "." ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error("Deploymentfiler skal ligge i en undermappe under backups/.");
  }
  return absolutePath;
}

export function parsePositiveInteger(value, label) {
  if (!/^\d+$/.test(String(value))) throw new Error(`${label} skal være et positivt heltal.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 3600) {
    throw new Error(`${label} skal være mellem 1 og 3600.`);
  }
  return parsed;
}

export function parseCommonArguments(args, options = {}) {
  const result = {
    envFile: ".env.production",
    allowDirty: false,
    allowHttp: false,
    dryRun: false,
    timeoutSeconds: 300,
    help: false,
  };
  const allowed = new Set(options.allowed ?? []);
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help") result.help = true;
    else if (argument === "--allow-dirty") result.allowDirty = true;
    else if (argument === "--allow-http") result.allowHttp = true;
    else if (argument === "--dry-run") result.dryRun = true;
    else if (argument === "--env-file") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--env-file kræver en sti.");
      result.envFile = value;
      index += 1;
    } else if (argument === "--timeout-seconds") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--timeout-seconds kræver en værdi.");
      result.timeoutSeconds = parsePositiveInteger(value, "--timeout-seconds");
      index += 1;
    } else if (allowed.has(argument)) {
      const definition = options.definitions?.[argument] ?? { type: "boolean" };
      const key = definition.key ?? argument.replace(/^--/, "").replace(/-([a-z])/g, (_m, c) => c.toUpperCase());
      if (definition.type === "value") {
        const value = args[index + 1];
        if (!value || value.startsWith("--")) throw new Error(`${argument} kræver en værdi.`);
        result[key] = value;
        index += 1;
      } else {
        result[key] = true;
      }
    } else {
      throw new Error(`Ukendt argument: ${argument}`);
    }
  }
  return result;
}

export function getServiceContainerIds(envFile, revision, service, options = {}) {
  const result = runCommand(
    "docker",
    productionComposeArgs(envFile, "ps", options.all ? "-a" : undefined, "-q", service).filter(Boolean),
    {
      env: productionProcessEnv(envFile, revision),
      allowFailure: options.allowFailure,
    },
  );
  return String(result.stdout || "")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function inspectContainer(containerId) {
  const result = runCommand("docker", ["inspect", containerId]);
  const parsed = JSON.parse(result.stdout || "[]");
  if (!parsed[0]) throw new Error(`Docker inspect returnerede ingen data for ${containerId}.`);
  return parsed[0];
}

export function getRunningDeploymentRevision(envFile, fallbackRevision = "unmanaged") {
  const ids = getServiceContainerIds(envFile, fallbackRevision, "backend", { all: true, allowFailure: true });
  if (ids.length === 0) return null;
  if (ids.length !== 1) throw new Error(`Forventede højst én production-backend, men fandt ${ids.length}.`);
  const inspect = inspectContainer(ids[0]);
  return inspect?.Config?.Labels?.[deploymentRevisionLabel] || "unmanaged";
}

export function getProductionStackState(envFile, revision) {
  const services = ["database", "backend", "frontend", "proxy"];
  const present = [];
  for (const service of services) {
    const ids = getServiceContainerIds(envFile, revision, service, { all: true, allowFailure: true });
    if (ids.length > 0) present.push(service);
  }
  return {
    present,
    absent: services.filter((service) => !present.includes(service)),
    isAbsent: present.length === 0,
    isComplete: present.length === services.length,
  };
}

export function assertCleanWorkingTree(allowDirty) {
  if (allowDirty) return;
  const status = runCommand("git", ["status", "--porcelain", "--untracked-files=normal"]).stdout.trim();
  if (status) throw new Error("Working tree er ikke ren. Commit eller fjern lokale ændringer før deployment.");
}

export function validateDeploymentRecord(record) {
  if (!record || record.formatVersion !== 1) throw new Error("Deploymentrecord har ukendt format.");
  for (const key of ["targetRevision", "createdAt", "envFile"]) {
    if (typeof record[key] !== "string" || !record[key]) throw new Error(`Deploymentrecord mangler ${key}.`);
  }
  if (record.previousRevision !== null && typeof record.previousRevision !== "string") {
    throw new Error("Deploymentrecord har ugyldig previousRevision.");
  }
  if (record.backupDirectory !== null && typeof record.backupDirectory !== "string") {
    throw new Error("Deploymentrecord har ugyldig backupDirectory.");
  }
  return record;
}

export function writeDeploymentRecord(path, record) {
  const safePath = ensureBackupPath(path);
  writeFileSync(safePath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return safePath;
}

export function readDeploymentRecord(path) {
  const safePath = ensureBackupPath(path);
  return validateDeploymentRecord(JSON.parse(readFileSync(safePath, "utf8")));
}

export function changedMigrationPaths(diffOutput) {
  return String(diffOutput || "")
    .split(/\r?\n/)
    .map((value) => value.trim().replaceAll("\\", "/"))
    .filter(Boolean)
    .filter(
      (path) =>
        path === "backend/prisma/schema.prisma" ||
        path.startsWith("backend/prisma/migrations/"),
    );
}

export function assertApplicationRollbackCompatibility(targetRevision, currentRevision) {
  const result = runCommand("git", [
    "diff",
    "--name-only",
    targetRevision,
    currentRevision,
    "--",
    "backend/prisma/schema.prisma",
    "backend/prisma/migrations",
  ]);
  const changed = changedMigrationPaths(result.stdout);
  if (changed.length > 0) {
    throw new Error(
      `Applikationsrollback er blokeret, fordi Prisma-schema eller migrationer er forskellige: ${changed.join(", ")}. Brug en isoleret recovery/cutover med den verificerede backup.`,
    );
  }
  return changed;
}

export async function waitForProductionServices(envFile, revision, timeoutSeconds = 300) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  let lastStatus = "";
  while (Date.now() < deadline) {
    const migrateIds = getServiceContainerIds(envFile, revision, "migrate", { all: true, allowFailure: true });
    const serviceStates = [];
    let ready = migrateIds.length === 1;
    if (migrateIds.length === 1) {
      const migrate = inspectContainer(migrateIds[0]);
      const exitCode = migrate?.State?.ExitCode;
      const status = migrate?.State?.Status;
      serviceStates.push(`migrate=${status}/${exitCode}`);
      ready = ready && status === "exited" && exitCode === 0;
      if (status === "exited" && exitCode !== 0) {
        throw new Error(`Prisma-migrationen fejlede med exitkode ${exitCode}.`);
      }
    }
    for (const service of ["database", "backend", "frontend", "proxy"]) {
      const ids = getServiceContainerIds(envFile, revision, service, { all: true, allowFailure: true });
      if (ids.length !== 1) {
        ready = false;
        serviceStates.push(`${service}=mangler`);
        continue;
      }
      const inspect = inspectContainer(ids[0]);
      const running = inspect?.State?.Running === true;
      const health = inspect?.State?.Health?.Status;
      serviceStates.push(`${service}=${running ? "running" : inspect?.State?.Status ?? "ukendt"}/${health ?? "ingen-health"}`);
      ready = ready && running && health === "healthy";
    }
    lastStatus = serviceStates.join(", ");
    if (ready) return lastStatus;
    await delay(2_000);
  }
  throw new Error(`Produktionsservices blev ikke klar inden ${timeoutSeconds} sekunder. Sidste status: ${lastStatus}`);
}

export async function smokeProductionOrigin(envFile) {
  const { values } = readProductionEnvFile(envFile);
  const baseUrl = values.APP_ORIGIN.replace(/\/$/, "");
  const rootResponse = await fetch(`${baseUrl}/`, { headers: { Accept: "text/html" } });
  if (rootResponse.status < 200 || rootResponse.status >= 400) {
    throw new Error(`Frontend-smoke fejlede: HTTP ${rootResponse.status}.`);
  }
  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (loginResponse.status !== 400) {
    throw new Error(`API-smoke forventede HTTP 400 fra /auth/login, men fik ${loginResponse.status}.`);
  }
  const socketResponse = await fetch(`${baseUrl}/socket.io/?EIO=4&transport=polling&t=${Date.now()}`);
  const socketBody = await socketResponse.text();
  if (socketResponse.status !== 200 || !socketBody.startsWith("0")) {
    throw new Error(`Socket.IO-smoke fejlede: HTTP ${socketResponse.status}, svar ${socketBody.slice(0, 80)}.`);
  }
  return { baseUrl, rootStatus: rootResponse.status, loginStatus: loginResponse.status, socketStatus: socketResponse.status };
}
