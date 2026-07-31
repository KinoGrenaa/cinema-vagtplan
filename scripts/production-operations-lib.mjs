import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

export const OPERATIONAL_BACKUP_FORMAT_VERSION = 1;
export const OPERATIONAL_BACKUP_MARKER = "operational-backup.json";
export const OPERATIONAL_BACKUP_PREFIX = "production-backup-";

function parsePositiveInteger(value, label, { min = 1, max = 100000 } = {}) {
  if (!/^\d+$/.test(String(value))) {
    throw new Error(`${label} skal være et positivt heltal.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label} skal være mellem ${min} og ${max}.`);
  }
  return parsed;
}

function takeValue(args, index, label) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${label} kræver en værdi.`);
  }
  return value;
}

export function parseProductionMonitorArgs(args = process.argv.slice(2)) {
  const result = {
    envFile: ".env.production",
    maxBackupAgeHours: 26,
    maxOffsiteAgeHours: 30,
    timeoutSeconds: 30,
    reportPath: null,
    json: false,
    allowHttp: false,
    help: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help") result.help = true;
    else if (argument === "--json") result.json = true;
    else if (argument === "--allow-http") result.allowHttp = true;
    else if (argument === "--env-file") {
      result.envFile = takeValue(args, index, argument);
      index += 1;
    } else if (argument === "--max-backup-age-hours") {
      result.maxBackupAgeHours = parsePositiveInteger(
        takeValue(args, index, argument),
        argument,
        { max: 24 * 365 },
      );
      index += 1;
    } else if (argument === "--max-offsite-age-hours") {
      result.maxOffsiteAgeHours = parsePositiveInteger(
        takeValue(args, index, argument),
        argument,
        { max: 24 * 365 },
      );
      index += 1;
    } else if (argument === "--timeout-seconds") {
      result.timeoutSeconds = parsePositiveInteger(
        takeValue(args, index, argument),
        argument,
        { max: 300 },
      );
      index += 1;
    } else if (argument === "--report") {
      result.reportPath = takeValue(args, index, argument);
      index += 1;
    } else {
      throw new Error(`Ukendt argument: ${argument}`);
    }
  }
  return result;
}

export function parseProductionBackupArgs(args = process.argv.slice(2)) {
  const result = {
    envFile: ".env.production",
    output: null,
    markOffsite: null,
    offsiteReference: null,
    prune: false,
    pruneOnly: false,
    dryRun: false,
    keepDaily: 7,
    keepWeekly: 4,
    keepMonthly: 12,
    help: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help") result.help = true;
    else if (argument === "--prune") result.prune = true;
    else if (argument === "--prune-only") result.pruneOnly = true;
    else if (argument === "--dry-run") result.dryRun = true;
    else if (argument === "--env-file") {
      result.envFile = takeValue(args, index, argument);
      index += 1;
    } else if (argument === "--output") {
      result.output = takeValue(args, index, argument);
      index += 1;
    } else if (argument === "--mark-offsite") {
      result.markOffsite = takeValue(args, index, argument);
      index += 1;
    } else if (argument === "--offsite-reference") {
      result.offsiteReference = takeValue(args, index, argument);
      index += 1;
    } else if (argument === "--keep-daily") {
      result.keepDaily = parsePositiveInteger(takeValue(args, index, argument), argument, { max: 365 });
      index += 1;
    } else if (argument === "--keep-weekly") {
      result.keepWeekly = parsePositiveInteger(takeValue(args, index, argument), argument, { max: 260 });
      index += 1;
    } else if (argument === "--keep-monthly") {
      result.keepMonthly = parsePositiveInteger(takeValue(args, index, argument), argument, { max: 120 });
      index += 1;
    } else {
      throw new Error(`Ukendt argument: ${argument}`);
    }
  }

  const modes = Number(Boolean(result.markOffsite)) + Number(result.pruneOnly);
  if (modes > 1) {
    throw new Error("--mark-offsite og --prune-only kan ikke kombineres.");
  }
  if (result.markOffsite && result.output) {
    throw new Error("--mark-offsite kan ikke kombineres med --output.");
  }
  if (result.markOffsite && (result.prune || result.dryRun)) {
    throw new Error("--mark-offsite kan ikke kombineres med --prune eller --dry-run.");
  }
  if (result.pruneOnly && result.output) {
    throw new Error("--prune-only kan ikke kombineres med --output.");
  }
  if (result.dryRun && !result.pruneOnly) {
    throw new Error("--dry-run er kun gyldig sammen med --prune-only.");
  }
  if (result.offsiteReference && !result.markOffsite) {
    throw new Error("--offsite-reference kræver --mark-offsite.");
  }
  return result;
}

export function ensureBackupsChild(path, backupsRoot, { direct = false } = {}) {
  const resolvedRoot = resolve(backupsRoot);
  const resolvedPath = resolve(path);
  const relativePath = relative(resolvedRoot, resolvedPath);
  if (
    !relativePath ||
    relativePath === "." ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error("Stien skal ligge i en undermappe under backups/.");
  }
  if (direct && relativePath.includes(sep)) {
    throw new Error("Operationelle backups skal ligge direkte under backups/.");
  }
  return resolvedPath;
}

export function validateOperationalBackupMarker(marker, backupDirectory) {
  if (!marker || marker.formatVersion !== OPERATIONAL_BACKUP_FORMAT_VERSION) {
    throw new Error("Operationel backupmarkør har ukendt format.");
  }
  if (marker.status !== "verified") {
    throw new Error("Operationel backup er ikke markeret som verificeret.");
  }
  for (const key of ["createdAt", "verifiedAt", "revision"]) {
    if (typeof marker[key] !== "string" || !marker[key]) {
      throw new Error(`Operationel backupmarkør mangler ${key}.`);
    }
  }
  const createdAt = new Date(marker.createdAt);
  const verifiedAt = new Date(marker.verifiedAt);
  if (!Number.isFinite(createdAt.getTime()) || !Number.isFinite(verifiedAt.getTime())) {
    throw new Error("Operationel backupmarkør har ugyldigt tidspunkt.");
  }
  if (marker.offsiteConfirmedAt !== null && marker.offsiteConfirmedAt !== undefined) {
    const offsite = new Date(marker.offsiteConfirmedAt);
    if (!Number.isFinite(offsite.getTime())) {
      throw new Error("Operationel backupmarkør har ugyldigt offsite-tidspunkt.");
    }
  }
  const expectedName = resolve(backupDirectory).split(/[\\/]/).at(-1);
  if (marker.backupName !== expectedName) {
    throw new Error("Operationel backupmarkør matcher ikke backupmappens navn.");
  }
  const serialized = JSON.stringify(marker);
  for (const forbidden of ["POSTGRES_PASSWORD", "JWT_SECRET", "DATABASE_URL", "password", "secret"]) {
    if (serialized.toLowerCase().includes(forbidden.toLowerCase())) {
      throw new Error("Operationel backupmarkør må ikke indeholde secrets.");
    }
  }
  return marker;
}

export function readOperationalBackupMarker(backupDirectory) {
  const markerPath = join(backupDirectory, OPERATIONAL_BACKUP_MARKER);
  if (!existsSync(markerPath)) {
    throw new Error(`Operationel backupmarkør mangler: ${markerPath}`);
  }
  let marker;
  try {
    marker = JSON.parse(readFileSync(markerPath, "utf8"));
  } catch (error) {
    throw new Error(`Operationel backupmarkør er ugyldigt JSON: ${error.message}`);
  }
  return validateOperationalBackupMarker(marker, backupDirectory);
}

export function writeOperationalBackupMarker(backupDirectory, marker) {
  validateOperationalBackupMarker(marker, backupDirectory);
  writeFileSync(
    join(backupDirectory, OPERATIONAL_BACKUP_MARKER),
    `${JSON.stringify(marker, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
}

export function listOperationalBackups(backupsRoot) {
  if (!existsSync(backupsRoot)) return [];
  const entries = [];
  for (const dirent of readdirSync(backupsRoot, { withFileTypes: true })) {
    if (!dirent.isDirectory() || !dirent.name.startsWith(OPERATIONAL_BACKUP_PREFIX)) continue;
    const directory = join(backupsRoot, dirent.name);
    try {
      const marker = readOperationalBackupMarker(directory);
      entries.push({ directory, marker });
    } catch {
      // Ukendte eller ufuldstændige mapper røres aldrig automatisk.
    }
  }
  return entries.sort(
    (a, b) => new Date(b.marker.createdAt).getTime() - new Date(a.marker.createdAt).getTime(),
  );
}

function isoWeekKey(dateValue) {
  const date = new Date(dateValue);
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function dayKey(dateValue) {
  return new Date(dateValue).toISOString().slice(0, 10);
}

function monthKey(dateValue) {
  return new Date(dateValue).toISOString().slice(0, 7);
}

function keepNewestDistinct(backups, limit, keyFunction, kept) {
  const keys = new Set();
  for (const backup of backups) {
    if (kept.has(backup.directory)) continue;
    const key = keyFunction(backup.marker.createdAt);
    if (keys.has(key)) continue;
    kept.add(backup.directory);
    keys.add(key);
    if (keys.size >= limit) break;
  }
}

export function planOperationalBackupRetention(
  backups,
  { keepDaily = 7, keepWeekly = 4, keepMonthly = 12 } = {},
) {
  const sorted = [...backups].sort(
    (a, b) => new Date(b.marker.createdAt).getTime() - new Date(a.marker.createdAt).getTime(),
  );
  const confirmed = sorted.filter((backup) => Boolean(backup.marker.offsiteConfirmedAt));
  const unconfirmed = sorted.filter((backup) => !backup.marker.offsiteConfirmedAt);
  const kept = new Set(unconfirmed.map((backup) => backup.directory));
  if (confirmed[0]) kept.add(confirmed[0].directory);
  keepNewestDistinct(confirmed, keepDaily, dayKey, kept);
  keepNewestDistinct(confirmed, keepWeekly, isoWeekKey, kept);
  keepNewestDistinct(confirmed, keepMonthly, monthKey, kept);

  return {
    keep: sorted.filter((backup) => kept.has(backup.directory)),
    remove: confirmed.filter((backup) => !kept.has(backup.directory)),
    protectedUnconfirmed: unconfirmed,
  };
}

export function latestOperationalBackupStatus(
  backups,
  { now = new Date(), maxBackupAgeHours = 26, maxOffsiteAgeHours = 30 } = {},
) {
  const latest = backups[0] ?? null;
  if (!latest) {
    return {
      ok: false,
      errors: ["Ingen verificeret operationel production-backup blev fundet."],
      latest: null,
    };
  }
  const errors = [];
  const backupAgeHours = (now.getTime() - new Date(latest.marker.createdAt).getTime()) / 3600000;
  if (backupAgeHours < 0 || backupAgeHours > maxBackupAgeHours) {
    errors.push(`Seneste operationelle backup er ${backupAgeHours.toFixed(1)} timer gammel.`);
  }
  let offsiteAgeHours = null;
  if (!latest.marker.offsiteConfirmedAt) {
    errors.push("Seneste operationelle backup er ikke bekræftet kopieret off-host.");
  } else {
    offsiteAgeHours =
      (now.getTime() - new Date(latest.marker.offsiteConfirmedAt).getTime()) / 3600000;
    if (offsiteAgeHours < 0 || offsiteAgeHours > maxOffsiteAgeHours) {
      errors.push(`Seneste off-host-bekræftelse er ${offsiteAgeHours.toFixed(1)} timer gammel.`);
    }
  }
  return {
    ok: errors.length === 0,
    errors,
    latest: {
      backupName: latest.marker.backupName,
      createdAt: latest.marker.createdAt,
      verifiedAt: latest.marker.verifiedAt,
      revision: latest.marker.revision,
      offsiteConfirmedAt: latest.marker.offsiteConfirmedAt ?? null,
      offsiteReference: latest.marker.offsiteReference ?? null,
      backupAgeHours,
      offsiteAgeHours,
    },
  };
}

export function safeWriteJson(path, value) {
  const parent = resolve(path, "..");
  if (!existsSync(parent) || !statSync(parent).isDirectory()) {
    throw new Error(`Rapportmappen findes ikke: ${parent}`);
  }
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  const lower = serialized.toLowerCase();
  for (const forbidden of ["postgres_password", "jwt_secret", "database_url"]) {
    if (lower.includes(forbidden)) {
      throw new Error("Monitorrapporten må ikke indeholde secrets.");
    }
  }
  writeFileSync(path, serialized, { encoding: "utf8", mode: 0o600 });
}
