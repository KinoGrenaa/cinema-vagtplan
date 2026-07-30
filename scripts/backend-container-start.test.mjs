import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";

import {
  ensureCompiledOutput,
  findCompiledEntry,
  replaceDirectoryContents,
} from "../backend/scripts/start-container.mjs";

const repoRoot = resolve(import.meta.dirname, "..");

function withTemporaryBackend(run) {
  const root = mkdtempSync(resolve(tmpdir(), "cinema-backend-start-"));
  try {
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function write(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, "utf8");
}

test("kompileret entrypoint findes i begge Nest-outputstrukturer", () => {
  withTemporaryBackend((root) => {
    const flatDist = resolve(root, "flat");
    const nestedDist = resolve(root, "nested");
    write(resolve(flatDist, "main.js"), "flat");
    write(resolve(nestedDist, "src", "main.js"), "nested");

    assert.equal(findCompiledEntry(flatDist), resolve(flatDist, "main.js"));
    assert.equal(
      findCompiledEntry(nestedDist),
      resolve(nestedDist, "src", "main.js"),
    );
  });
});

test("seneste projektbuild synkroniseres til separat runtime-volume", () => {
  withTemporaryBackend((root) => {
    const buildDir = resolve(root, "dist");
    const runtimeDir = resolve(root, "runtime-dist");
    write(resolve(buildDir, "src", "main.js"), "new build");
    write(resolve(buildDir, "src", "feature.js"), "new feature");
    write(resolve(runtimeDir, "src", "main.js"), "old runtime");
    write(resolve(runtimeDir, "stale.js"), "stale");

    const result = ensureCompiledOutput({
      cwd: root,
      buildDir,
      runtimeDir,
      seedDir: resolve(root, "seed"),
    });

    assert.equal(result.source, "project-build");
    assert.equal(result.distEntry, resolve(runtimeDir, "src", "main.js"));
    assert.equal(
      readFileSync(resolve(runtimeDir, "src", "main.js"), "utf8"),
      "new build",
    );
    assert.equal(
      readFileSync(resolve(runtimeDir, "src", "feature.js"), "utf8"),
      "new feature",
    );
    assert.equal(findCompiledEntry(buildDir), resolve(buildDir, "src", "main.js"));
    assert.throws(() => readFileSync(resolve(runtimeDir, "stale.js"), "utf8"));
  });
});

test("eksisterende runtime-output genbruges når projektbuild mangler", () => {
  withTemporaryBackend((root) => {
    const runtimeDir = resolve(root, "runtime-dist");
    const entry = resolve(runtimeDir, "main.js");
    write(entry, "existing runtime");

    const result = ensureCompiledOutput({
      cwd: root,
      buildDir: resolve(root, "missing-build"),
      runtimeDir,
      seedDir: resolve(root, "seed"),
    });

    assert.equal(result.source, "existing-runtime");
    assert.equal(result.distEntry, entry);
    assert.equal(readFileSync(entry, "utf8"), "existing runtime");
  });
});

test("tom runtime-volume initialiseres fra fladt Docker-image-seed", () => {
  withTemporaryBackend((root) => {
    const seedDir = resolve(root, "seed");
    const runtimeDir = resolve(root, "runtime-dist");
    write(resolve(seedDir, "main.js"), "seeded");
    write(resolve(seedDir, "feature.js"), "feature");

    const result = ensureCompiledOutput({
      cwd: root,
      buildDir: resolve(root, "missing-build"),
      runtimeDir,
      seedDir,
    });

    assert.equal(result.source, "image-seed");
    assert.equal(result.distEntry, resolve(runtimeDir, "main.js"));
    assert.equal(readFileSync(resolve(runtimeDir, "main.js"), "utf8"), "seeded");
    assert.equal(readFileSync(resolve(runtimeDir, "feature.js"), "utf8"), "feature");
  });
});

test("tom runtime-volume initialiseres fra nested Docker-image-seed", () => {
  withTemporaryBackend((root) => {
    const seedDir = resolve(root, "seed");
    const runtimeDir = resolve(root, "runtime-dist");
    write(resolve(seedDir, "src", "main.js"), "nested seed");
    write(resolve(seedDir, "src", "feature.js"), "feature");

    const result = ensureCompiledOutput({
      cwd: root,
      buildDir: resolve(root, "missing-build"),
      runtimeDir,
      seedDir,
    });

    assert.equal(result.source, "image-seed");
    assert.equal(result.distEntry, resolve(runtimeDir, "src", "main.js"));
    assert.equal(
      readFileSync(resolve(runtimeDir, "src", "main.js"), "utf8"),
      "nested seed",
    );
  });
});

test("buildmappe og runtime-mappe skal være adskilt", () => {
  withTemporaryBackend((root) => {
    const distDir = resolve(root, "dist");
    write(resolve(distDir, "main.js"), "compiled");

    assert.throws(
      () => replaceDirectoryContents(distDir, distDir),
      /må ikke være den samme mappe/,
    );
  });
});

test("manglende build, runtime-output og seed giver handlingsklar fejl", () => {
  withTemporaryBackend((root) => {
    assert.throws(
      () =>
        ensureCompiledOutput({
          cwd: root,
          buildDir: resolve(root, "missing-build"),
          runtimeDir: resolve(root, "missing-runtime"),
          seedDir: resolve(root, "missing-seed"),
        }),
      /Kør `npm run build` eller genopbyg backend-imaget/,
    );
  });
});

test("Docker-konfigurationen adskiller buildoutput fra runtime-volume og bevarer node_modules-opslag", () => {
  const compose = readFileSync(resolve(repoRoot, "docker-compose.yml"), "utf8");
  const dockerfile = readFileSync(resolve(repoRoot, "backend", "Dockerfile"), "utf8");
  const packageJson = JSON.parse(
    readFileSync(resolve(repoRoot, "backend", "package.json"), "utf8"),
  );

  assert.match(compose, /command:\s*\["npm", "run", "start:container"\]/);
  assert.match(compose, /backend_dist:\/app\/runtime-dist/);
  assert.doesNotMatch(compose, /backend_dist:\/app\/dist/);
  assert.doesNotMatch(compose, /backend_dist:\/runtime\/backend-dist/);
  assert.match(dockerfile, /RUN npm run build/);
  assert.match(dockerfile, /\/opt\/backend-dist/);
  assert.equal(packageJson.scripts.build, "nest build");
  assert.equal(packageJson.scripts["start:container"], "node ./scripts/start-container.mjs");
});
