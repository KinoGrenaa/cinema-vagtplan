import { readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const frontendRoot = resolve(import.meta.dirname, "..");
const outputDir = join(frontendRoot, ".dashboard-test-build");
const compiler = join(frontendRoot, "node_modules", "typescript", "bin", "tsc");

function collectTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTests(path);
    return entry.name.endsWith(".test.js") ? [path] : [];
  });
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: frontendRoot,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

rmSync(outputDir, { recursive: true, force: true });

try {
  const compileStatus = run(process.execPath, [
    compiler,
    "-p",
    "tsconfig.dashboard-tests.json",
  ]);
  if (compileStatus !== 0) process.exit(compileStatus);

  const testDirectory = join(outputDir, "tests", "dashboard");
  const testFiles = collectTests(testDirectory).sort();
  if (testFiles.length === 0) {
    console.error("Ingen kompilerede dashboardtests blev fundet.");
    process.exit(1);
  }

  process.exitCode = run(process.execPath, ["--test", ...testFiles]);
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}
