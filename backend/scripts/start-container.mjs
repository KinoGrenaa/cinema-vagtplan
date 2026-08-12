import { spawn } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const COMPILED_ENTRY_CANDIDATES = ["main.js", "src/main.js"];

export function findCompiledEntry(directory) {
  for (const relativePath of COMPILED_ENTRY_CANDIDATES) {
    const candidate = resolve(directory, relativePath);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function getCompiledOutputFreshness(directory) {
  const entry = findCompiledEntry(directory);
  if (!entry) {
    return null;
  }

  return statSync(entry).mtimeMs;
}

export function replaceDirectoryContents(sourceDir, targetDir) {
  const sourceEntry = findCompiledEntry(sourceDir);
  if (!sourceEntry) {
    throw new Error(`Kompileret backend-output mangler i ${sourceDir}.`);
  }

  if (resolve(sourceDir) === resolve(targetDir)) {
    throw new Error("Buildmappe og runtime-mappe må ikke være den samme mappe.");
  }

  mkdirSync(targetDir, { recursive: true });
  for (const entry of readdirSync(targetDir)) {
    rmSync(resolve(targetDir, entry), { recursive: true, force: true });
  }

  for (const entry of readdirSync(sourceDir)) {
    cpSync(resolve(sourceDir, entry), resolve(targetDir, entry), {
      recursive: true,
    });
  }

  const targetEntry = findCompiledEntry(targetDir);
  if (!targetEntry) {
    throw new Error("Kunne ikke klargøre backendens runtime-output.");
  }

  return targetEntry;
}

export function selectCompiledOutputSource({
  buildDir,
  seedDir,
} = {}) {
  const buildFreshness = buildDir
    ? getCompiledOutputFreshness(buildDir)
    : null;
  const seedFreshness = seedDir
    ? getCompiledOutputFreshness(seedDir)
    : null;

  if (buildFreshness !== null && seedFreshness !== null) {
    if (buildFreshness > seedFreshness) {
      return {
        directory: buildDir,
        source: "project-build",
      };
    }

    return {
      directory: seedDir,
      source: "image-seed",
    };
  }

  if (buildFreshness !== null) {
    return {
      directory: buildDir,
      source: "project-build",
    };
  }

  if (seedFreshness !== null) {
    return {
      directory: seedDir,
      source: "image-seed",
    };
  }

  return null;
}

export function ensureCompiledOutput({
  cwd = process.cwd(),
  buildDir = resolve(cwd, "dist"),
  runtimeDir = process.env.BACKEND_RUNTIME_DIST ?? "/app/runtime-dist",
  seedDir = process.env.BACKEND_DIST_SEED ?? "/opt/backend-dist",
} = {}) {
  const selectedSource = selectCompiledOutputSource({
    buildDir,
    seedDir,
  });

  if (selectedSource) {
    return {
      distEntry: replaceDirectoryContents(
        selectedSource.directory,
        runtimeDir,
      ),
      source: selectedSource.source,
    };
  }

  const runtimeEntry = findCompiledEntry(runtimeDir);
  if (runtimeEntry) {
    return {
      distEntry: runtimeEntry,
      source: "existing-runtime",
    };
  }

  throw new Error(
    "Backendens kompilerede output mangler. Kør `npm run build` eller genopbyg backend-imaget.",
  );
}

export function startCompiledBackend(options = {}) {
  const { distEntry, source } = ensureCompiledOutput(options);

  if (source === "project-build") {
    console.log("Synkroniserede backendens runtime-output fra seneste lokale build.");
  } else if (source === "image-seed") {
    console.log("Synkroniserede backendens runtime-output fra det byggede Docker-image.");
  } else {
    console.log("Bruger eksisterende backend runtime-output som fallback.");
  }

  const child = spawn(process.execPath, [distEntry], {
    cwd: options.cwd ?? process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  let stopping = false;
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => {
      stopping = true;
      child.kill(signal);
    });
  }

  child.once("error", (error) => {
    console.error(`Kunne ikke starte backend: ${error.message}`);
    process.exitCode = 1;
  });

  child.once("exit", (code, signal) => {
    if (stopping || signal) {
      process.exit(0);
    }
    process.exit(code ?? 1);
  });

  return child;
}

const isDirectExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;

if (isDirectExecution) {
  try {
    startCompiledBackend();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
