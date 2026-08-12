import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  ensureCompiledOutput,
  selectCompiledOutputSource,
} from "./start-container.mjs";

function makeCompiledDir(root, name, content, timestampMs) {
  const directory = path.join(root, name);
  const entryDirectory = path.join(directory, "src");
  mkdirSync(entryDirectory, { recursive: true });
  const entry = path.join(entryDirectory, "main.js");
  writeFileSync(entry, content, "utf8");
  const timestamp = new Date(timestampMs);
  utimesSync(entry, timestamp, timestamp);
  return directory;
}

test("nyere image-seed vinder over gammel lokal dist og gammelt runtime-volume", () => {
  const root = mkdtempSync(
    path.join(os.tmpdir(), "backend-runtime-seed-"),
  );

  try {
    const buildDir = makeCompiledDir(
      root,
      "dist",
      "OLD_LOCAL_BUILD",
      1_000,
    );
    const seedDir = makeCompiledDir(
      root,
      "seed",
      "NEW_IMAGE_BUILD",
      3_000,
    );
    const runtimeDir = makeCompiledDir(
      root,
      "runtime",
      "STALE_RUNTIME",
      2_000,
    );

    const selected = selectCompiledOutputSource({
      buildDir,
      seedDir,
    });
    assert.equal(selected?.source, "image-seed");

    const result = ensureCompiledOutput({
      buildDir,
      seedDir,
      runtimeDir,
    });

    assert.equal(result.source, "image-seed");
    assert.equal(
      readFileSync(
        path.join(runtimeDir, "src/main.js"),
        "utf8",
      ),
      "NEW_IMAGE_BUILD",
    );
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});

test("nyere lokal build vinder, så hurtig backend-restart fortsat virker", () => {
  const root = mkdtempSync(
    path.join(os.tmpdir(), "backend-runtime-local-"),
  );

  try {
    const buildDir = makeCompiledDir(
      root,
      "dist",
      "NEW_LOCAL_BUILD",
      4_000,
    );
    const seedDir = makeCompiledDir(
      root,
      "seed",
      "OLDER_IMAGE_BUILD",
      3_000,
    );
    const runtimeDir = path.join(
      root,
      "runtime",
    );

    const result = ensureCompiledOutput({
      buildDir,
      seedDir,
      runtimeDir,
    });

    assert.equal(result.source, "project-build");
    assert.equal(
      readFileSync(
        path.join(runtimeDir, "src/main.js"),
        "utf8",
      ),
      "NEW_LOCAL_BUILD",
    );
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});

test("eksisterende runtime bruges kun som fallback uden build eller image-seed", () => {
  const root = mkdtempSync(
    path.join(os.tmpdir(), "backend-runtime-fallback-"),
  );

  try {
    const runtimeDir = makeCompiledDir(
      root,
      "runtime",
      "FALLBACK_RUNTIME",
      2_000,
    );

    const result = ensureCompiledOutput({
      buildDir: path.join(root, "missing-dist"),
      seedDir: path.join(root, "missing-seed"),
      runtimeDir,
    });

    assert.equal(result.source, "existing-runtime");
    assert.equal(
      readFileSync(result.distEntry, "utf8"),
      "FALLBACK_RUNTIME",
    );
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});
