import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { collectDataRecoveryErrors } from "./check-data-recovery.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const files = [
  "package.json",
  ".gitignore",
  "docs/data-recovery.md",
  "scripts/create-backup.mjs",
  "scripts/verify-backup.mjs",
  "scripts/rehearse-restore.mjs",
  "scripts/recovery-lib.mjs",
];

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "cinema-recovery-test-"));
  for (const path of files) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(repoRoot, path), target);
  }
  return root;
}

function mutate(root, path, transform) {
  const file = join(root, path);
  writeFileSync(file, transform(readFileSync(file, "utf8")), "utf8");
}

test("den aktuelle repository-tilstand opfylder datagendannelseskravene", () => {
  assert.deepEqual(collectDataRecoveryErrors(repoRoot), []);
});

test("kontrollen afviser manglende uploads-backup", () => {
  const root = fixture();
  try {
    mutate(root, "scripts/create-backup.mjs", (content) =>
      content.replace("tar -czf - -C /app/uploads", "tar -czf - -C /tmp"),
    );
    assert.ok(collectDataRecoveryErrors(root).some((error) => error.includes("Uploadbackup")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("kontrollen afviser manglende SHA-256-manifest", () => {
  const root = fixture();
  try {
    mutate(root, "scripts/recovery-lib.mjs", (content) =>
      content.replace('createHash("sha256")', 'createHash("sha1")'),
    );
    assert.ok(collectDataRecoveryErrors(root).some((error) => error.includes("SHA-256")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("kontrollen afviser restore-rehearsal uden oprydning", () => {
  const root = fixture();
  try {
    mutate(root, "scripts/rehearse-restore.mjs", (content) =>
      content.replace('"volume", "rm", "-f"', '"volume", "inspect"'),
    );
    assert.ok(collectDataRecoveryErrors(root).some((error) => error.includes("Oprydning af volumes")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
