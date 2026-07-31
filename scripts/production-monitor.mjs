import { mkdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readProductionEnvFile } from "./production-env-lib.mjs";
import {
  deploymentRevisionLabel,
  getServiceContainerIds,
  inspectContainer,
  normalizeEnvFile,
  repoRoot,
} from "./production-deploy-lib.mjs";
import {
  ensureBackupsChild,
  latestOperationalBackupStatus,
  listOperationalBackups,
  parseProductionMonitorArgs,
  safeWriteJson,
} from "./production-operations-lib.mjs";

const backupsRoot = resolve(repoRoot, "backups");

function printHelp() {
  console.log(`Read-only production-monitor\n\nBrug:\n  npm run production:monitor -- --env-file .env.production\n  npm run production:monitor -- --env-file .env.production --report backups/production-monitor/latest.json\n\nKontrollen validerer service-health, revisionslabels, migrationens exitkode, frontend/API/Socket.IO og friskheden af den seneste verificerede off-host-bekræftede operationelle backup. Exitkode 1 betyder, at overvågningen skal alarmere.`);
}

function serviceSummary(envFile, revisionHint) {
  const services = [];
  const errors = [];
  for (const service of ["database", "backend", "frontend", "proxy"]) {
    const ids = getServiceContainerIds(envFile, revisionHint, service, {
      all: true,
      allowFailure: true,
    });
    if (ids.length !== 1) {
      errors.push(`${service}: forventede én container, fandt ${ids.length}.`);
      services.push({ service, present: ids.length > 0, running: false, health: null, revision: null });
      continue;
    }
    const inspect = inspectContainer(ids[0]);
    const running = inspect?.State?.Running === true;
    const health = inspect?.State?.Health?.Status ?? null;
    const revision = inspect?.Config?.Labels?.[deploymentRevisionLabel] ?? "unmanaged";
    if (!running) errors.push(`${service}: containeren kører ikke.`);
    if (health !== "healthy") errors.push(`${service}: health er ${health ?? "mangler"}.`);
    if (!revision || revision === "unmanaged") errors.push(`${service}: deploymentrevision mangler.`);
    services.push({ service, present: true, running, health, revision });
  }
  const knownRevisions = [...new Set(services.map((service) => service.revision).filter(Boolean))];
  if (knownRevisions.length > 1) {
    errors.push(`Services har forskellige revisionslabels: ${knownRevisions.join(", ")}.`);
  }
  return { services, errors, revision: knownRevisions.length === 1 ? knownRevisions[0] : null };
}

function migrationSummary(envFile, revisionHint) {
  const ids = getServiceContainerIds(envFile, revisionHint, "migrate", {
    all: true,
    allowFailure: true,
  });
  if (ids.length !== 1) {
    return {
      migration: { present: ids.length > 0, status: null, exitCode: null },
      errors: [`migrate: forventede én container, fandt ${ids.length}.`],
    };
  }
  const inspect = inspectContainer(ids[0]);
  const status = inspect?.State?.Status ?? null;
  const exitCode = inspect?.State?.ExitCode ?? null;
  const errors = [];
  if (status !== "exited" || exitCode !== 0) {
    errors.push(`migrate: forventede exited/0, fik ${status ?? "ukendt"}/${String(exitCode)}.`);
  }
  return { migration: { present: true, status, exitCode }, errors };
}

async function fetchWithTimeout(url, options, timeoutSeconds) {
  const signal = AbortSignal.timeout(timeoutSeconds * 1000);
  return fetch(url, { ...options, signal });
}

async function smokeSummary(envFile, timeoutSeconds) {
  const { values } = readProductionEnvFile(envFile);
  const baseUrl = values.APP_ORIGIN.replace(/\/$/, "");
  const errors = [];
  const result = { baseUrl, rootStatus: null, loginStatus: null, socketStatus: null };
  try {
    const root = await fetchWithTimeout(`${baseUrl}/`, { headers: { Accept: "text/html" } }, timeoutSeconds);
    result.rootStatus = root.status;
    if (root.status < 200 || root.status >= 400) errors.push(`Frontend-smoke: HTTP ${root.status}.`);
  } catch (error) {
    errors.push(`Frontend-smoke: ${error instanceof Error ? error.message : String(error)}.`);
  }
  try {
    const login = await fetchWithTimeout(
      `${baseUrl}/auth/login`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
      timeoutSeconds,
    );
    result.loginStatus = login.status;
    if (login.status !== 400) errors.push(`API-smoke: forventede HTTP 400, fik ${login.status}.`);
  } catch (error) {
    errors.push(`API-smoke: ${error instanceof Error ? error.message : String(error)}.`);
  }
  try {
    const socket = await fetchWithTimeout(
      `${baseUrl}/socket.io/?EIO=4&transport=polling&t=${Date.now()}`,
      {},
      timeoutSeconds,
    );
    const body = await socket.text();
    result.socketStatus = socket.status;
    if (socket.status !== 200 || !body.startsWith("0")) {
      errors.push(`Socket.IO-smoke: HTTP ${socket.status}, ugyldigt handshake.`);
    }
  } catch (error) {
    errors.push(`Socket.IO-smoke: ${error instanceof Error ? error.message : String(error)}.`);
  }
  return { smoke: result, errors };
}

export async function collectProductionMonitorReport(options, now = new Date()) {
  const envFile = normalizeEnvFile(options.envFile);
  const { values } = readProductionEnvFile(envFile);
  if (!options.allowHttp && !values.APP_ORIGIN.startsWith("https://")) {
    throw new Error("APP_ORIGIN skal bruge HTTPS. Brug kun --allow-http til en isoleret lokal probe.");
  }
  const service = serviceSummary(envFile, "unmanaged");
  const migration = migrationSummary(envFile, service.revision ?? "unmanaged");
  const smoke = await smokeSummary(envFile, options.timeoutSeconds);
  const backup = latestOperationalBackupStatus(listOperationalBackups(backupsRoot), {
    now,
    maxBackupAgeHours: options.maxBackupAgeHours,
    maxOffsiteAgeHours: options.maxOffsiteAgeHours,
  });
  const errors = [...service.errors, ...migration.errors, ...smoke.errors, ...backup.errors];
  return {
    formatVersion: 1,
    generatedAt: now.toISOString(),
    ok: errors.length === 0,
    revision: service.revision,
    services: service.services,
    migration: migration.migration,
    smoke: smoke.smoke,
    backup: backup.latest,
    thresholds: {
      maxBackupAgeHours: options.maxBackupAgeHours,
      maxOffsiteAgeHours: options.maxOffsiteAgeHours,
      timeoutSeconds: options.timeoutSeconds,
    },
    errors,
  };
}

function printHumanReport(report) {
  console.log(report.ok ? "Production-monitor OK." : "Production-monitor FEJL.");
  console.log(`Revision: ${report.revision ?? "ukendt"}`);
  console.log(
    `Services: ${report.services
      .map((service) => `${service.service}=${service.running ? "running" : "stoppet"}/${service.health ?? "ingen-health"}`)
      .join(", ")}`,
  );
  console.log(
    `Smoke: frontend ${report.smoke.rootStatus ?? "fejl"}, API ${report.smoke.loginStatus ?? "fejl"}, Socket.IO ${report.smoke.socketStatus ?? "fejl"}`,
  );
  if (report.backup) {
    console.log(`Backup: ${report.backup.backupName}, alder ${report.backup.backupAgeHours.toFixed(1)} timer.`);
    console.log(
      `Off-host: ${report.backup.offsiteConfirmedAt ? `${report.backup.offsiteAgeHours.toFixed(1)} timer siden` : "ikke bekræftet"}.`,
    );
  } else {
    console.log("Backup: ingen verificeret operationel backup fundet.");
  }
  for (const error of report.errors) console.error(`- ${error}`);
}

export async function runProductionMonitor(args = process.argv.slice(2)) {
  try {
    const options = parseProductionMonitorArgs(args);
    if (options.help) {
      printHelp();
      return 0;
    }
    const report = await collectProductionMonitorReport(options);
    if (options.reportPath) {
      const reportPath = ensureBackupsChild(options.reportPath, backupsRoot);
      mkdirSync(dirname(reportPath), { recursive: true, mode: 0o700 });
      safeWriteJson(reportPath, report);
      if (!options.json) console.log(`Monitorrapport: ${relative(repoRoot, reportPath)}`);
    }
    if (options.json) console.log(JSON.stringify(report));
    else printHumanReport(report);
    return report.ok ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (args.includes("--json")) {
      console.log(JSON.stringify({ formatVersion: 1, generatedAt: new Date().toISOString(), ok: false, errors: [message] }));
    } else {
      console.error(`Production-monitor fejlede: ${message}`);
    }
    return 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runProductionMonitor();
}
