import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { collectProductionOperationsProblems } from "./check-production-operations.mjs";
import {
  OPERATIONAL_BACKUP_FORMAT_VERSION,
  OPERATIONAL_BACKUP_MARKER,
  latestOperationalBackupStatus,
  listOperationalBackups,
  parseProductionBackupArgs,
  parseProductionMonitorArgs,
  planOperationalBackupRetention,
  safeWriteJson,
  validateOperationalBackupMarker,
  writeOperationalBackupMarker,
} from "./production-operations-lib.mjs";

function marker(name, createdAt, overrides = {}) {
  return {
    formatVersion: OPERATIONAL_BACKUP_FORMAT_VERSION,
    status: "verified",
    backupName: name,
    createdAt,
    verifiedAt: createdAt,
    revision: "a".repeat(40),
    fileCount: 2,
    totalBytes: 100,
    databaseEntryCount: 10,
    uploadEntryCount: 3,
    offsiteConfirmedAt: createdAt,
    offsiteReference: "object-lock:test",
    ...overrides,
  };
}

function withTempDirectory(run) {
  const directory = mkdtempSync(join(tmpdir(), "cinema-production-operations-"));
  try {
    return run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("monitorargumenter bruger sikre standarder", () => {
  assert.deepEqual(parseProductionMonitorArgs([]), {
    envFile: ".env.production",
    maxBackupAgeHours: 26,
    maxOffsiteAgeHours: 30,
    timeoutSeconds: 30,
    reportPath: null,
    json: false,
    allowHttp: false,
    help: false,
  });
});

test("monitorargumenter kan strammes og afviser ugyldige værdier", () => {
  const parsed = parseProductionMonitorArgs([
    "--env-file", "prod.env", "--max-backup-age-hours", "12",
    "--max-offsite-age-hours", "14", "--timeout-seconds", "20",
    "--report", "backups/monitor/latest.json", "--json", "--allow-http",
  ]);
  assert.equal(parsed.envFile, "prod.env");
  assert.equal(parsed.maxBackupAgeHours, 12);
  assert.equal(parsed.maxOffsiteAgeHours, 14);
  assert.equal(parsed.timeoutSeconds, 20);
  assert.equal(parsed.json, true);
  assert.throws(() => parseProductionMonitorArgs(["--timeout-seconds", "0"]), /mellem 1 og 300/);
});

test("backupargumenter adskiller create, off-host og retention", () => {
  assert.equal(parseProductionBackupArgs([]).keepDaily, 7);
  assert.equal(parseProductionBackupArgs(["--mark-offsite", "backups/x"]).markOffsite, "backups/x");
  assert.equal(parseProductionBackupArgs(["--prune-only", "--dry-run"]).dryRun, true);
  assert.throws(
    () => parseProductionBackupArgs(["--mark-offsite", "backups/x", "--prune"]),
    /kan ikke kombineres/,
  );
  assert.throws(() => parseProductionBackupArgs(["--dry-run"]), /kun gyldig/);
});

test("operationelle backupmarkører valideres uden secrets", () => {
  const directory = join("/tmp", "production-backup-test");
  assert.equal(validateOperationalBackupMarker(marker("production-backup-test", "2026-07-31T00:00:00.000Z"), directory).status, "verified");
  assert.throws(
    () => validateOperationalBackupMarker(marker("forkert", "2026-07-31T00:00:00.000Z"), directory),
    /matcher ikke/,
  );
  assert.throws(
    () => validateOperationalBackupMarker({ ...marker("production-backup-test", "2026-07-31T00:00:00.000Z"), JWT_SECRET: "x" }, directory),
    /må ikke indeholde secrets/,
  );
});

test("backupopslag ignorerer ukendte mapper og sorterer nyeste først", () => withTempDirectory((root) => {
  const older = join(root, "production-backup-older");
  const newer = join(root, "production-backup-newer");
  const broken = join(root, "production-backup-broken");
  mkdirSync(older); mkdirSync(newer); mkdirSync(broken);
  writeOperationalBackupMarker(older, marker("production-backup-older", "2026-07-30T00:00:00.000Z"));
  writeOperationalBackupMarker(newer, marker("production-backup-newer", "2026-07-31T00:00:00.000Z"));
  writeFileSync(join(broken, OPERATIONAL_BACKUP_MARKER), "{}\n");
  assert.deepEqual(listOperationalBackups(root).map((entry) => entry.marker.backupName), [
    "production-backup-newer",
    "production-backup-older",
  ]);
}));

test("retention beskytter lokale-only backups og finder sikre slettekandidater", () => {
  const backups = [];
  for (let day = 0; day < 35; day += 1) {
    const date = new Date(Date.UTC(2026, 6, 31 - day, 2, 30));
    const name = `production-backup-${day}`;
    backups.push({ directory: `/backups/${name}`, marker: marker(name, date.toISOString()) });
  }
  backups.unshift({
    directory: "/backups/production-backup-local-only",
    marker: marker("production-backup-local-only", "2026-08-01T02:30:00.000Z", {
      offsiteConfirmedAt: null,
      offsiteReference: null,
    }),
  });
  const plan = planOperationalBackupRetention(backups, { keepDaily: 7, keepWeekly: 4, keepMonthly: 2 });
  assert.equal(plan.protectedUnconfirmed.length, 1);
  assert.ok(plan.keep.some((entry) => entry.directory.endsWith("local-only")));
  assert.ok(plan.remove.length > 0);
  assert.ok(plan.remove.every((entry) => entry.marker.offsiteConfirmedAt));
});

test("backupfriskhed kræver både ny backup og frisk off-host-bekræftelse", () => {
  const now = new Date("2026-07-31T12:00:00.000Z");
  const good = [{
    directory: "/backups/production-backup-good",
    marker: marker("production-backup-good", "2026-07-31T02:30:00.000Z", {
      offsiteConfirmedAt: "2026-07-31T03:00:00.000Z",
    }),
  }];
  assert.equal(latestOperationalBackupStatus(good, { now }).ok, true);
  const localOnly = [{ ...good[0], marker: { ...good[0].marker, offsiteConfirmedAt: null } }];
  assert.equal(latestOperationalBackupStatus(localOnly, { now }).ok, false);
  assert.match(latestOperationalBackupStatus(localOnly, { now }).errors.join(" "), /ikke bekræftet/);
});

test("gammel backup udløser en handlingsklar fejl", () => {
  const status = latestOperationalBackupStatus([{
    directory: "/backups/production-backup-old",
    marker: marker("production-backup-old", "2026-07-20T02:30:00.000Z"),
  }], { now: new Date("2026-07-31T12:00:00.000Z"), maxBackupAgeHours: 26 });
  assert.equal(status.ok, false);
  assert.match(status.errors.join(" "), /timer gammel/);
});

test("monitorrapporter kan skrives uden secrets og afviser secretfelter", () => withTempDirectory((root) => {
  const path = join(root, "report.json");
  safeWriteJson(path, { formatVersion: 1, ok: true, revision: "abc" });
  assert.equal(JSON.parse(readFileSync(path, "utf8")).ok, true);
  assert.throws(() => safeWriteJson(path, { JWT_SECRET: "x" }), /må ikke indeholde secrets/);
}));

test("den aktuelle repository-tilstand opfylder production operations-kravene", () => {
  assert.deepEqual(collectProductionOperationsProblems(), []);
});
