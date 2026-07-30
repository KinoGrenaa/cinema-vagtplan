import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import {
  buildRuntimeSummary,
  findRuntimeLogIssues,
  formatProbeProgress,
  parseRuntimeArguments,
  validateProbe,
} from "./runtime-verification.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
let options;
try {
  options = parseRuntimeArguments(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}

function runDocker(args, { capture = false } = {}) {
  const result = spawnSync("docker", ["compose", ...args], {
    cwd: repoRoot,
    encoding: capture ? "utf8" : undefined,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const details = capture ? `${result.stdout ?? ""}${result.stderr ?? ""}`.trim() : "";
    throw new Error(details || `docker compose ${args.join(" ")} fejlede.`);
  }
  return capture ? result.stdout ?? "" : "";
}

function verifyRunningServices() {
  const output = runDocker(["ps", "--services", "--status", "running"], { capture: true });
  const running = new Set(output.split(/\r?\n/).map((value) => value.trim()).filter(Boolean));
  const missing = ["backend", "frontend"].filter((service) => !running.has(service));
  if (missing.length > 0) {
    throw new Error(`Følgende services kører ikke: ${missing.join(", ")}`);
  }
}

async function probe(label, url, { acceptClientErrors = false, expectedText = null } = {}) {
  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
    });
    const body = expectedText ? await response.text() : "";
    return {
      label,
      error: validateProbe({
        acceptClientErrors,
        body,
        expectedText,
        status: response.status,
      }),
      status: response.status,
    };
  } catch (error) {
    return {
      label,
      error: error instanceof Error ? error.message : String(error),
      status: null,
    };
  }
}

async function waitForReadiness() {
  const deadline = Date.now() + options.timeoutMs;
  let lastResults = [];
  while (Date.now() <= deadline) {
    verifyRunningServices();
    lastResults = await Promise.all([
      probe("Backend", options.backendUrl, { acceptClientErrors: true }),
      probe("Frontend", options.frontendUrl),
    ]);
    if (lastResults.every((result) => !result.error)) return lastResults;
    console.log(formatProbeProgress(lastResults));
    await new Promise((resolvePromise) => setTimeout(resolvePromise, options.intervalMs));
  }
  throw new Error(`Services blev ikke klar inden for ${options.timeoutMs} ms: ${formatProbeProgress(lastResults)}`);
}

function readCurrentRestartLogs() {
  const since = options.since ?? new Date(Date.now() - 5 * 60_000).toISOString();
  return runDocker([
    "logs",
    "--since",
    since,
    "--no-color",
    "backend",
    "frontend",
  ], { capture: true });
}

try {
  console.log("Venter på backend og frontend efter genstart...");
  const results = await waitForReadiness();
  const logs = readCurrentRestartLogs();
  const issues = findRuntimeLogIssues(logs);
  if (options.showLogs) {
    const lines = logs.trim().split(/\r?\n/);
    console.log("\nLogs fra den aktuelle genstart:");
    console.log(lines.slice(-120).join("\n") || "(ingen nye logs)");
  }
  if (issues.length > 0) {
    console.error("\nRuntime-logkontrollen fandt nye fatale fejl:");
    for (const issue of issues) console.error(`- ${issue}`);
    process.exit(1);
  }
  const backend = results.find((result) => result.label === "Backend");
  const frontend = results.find((result) => result.label === "Frontend");
  console.log(`\n${buildRuntimeSummary({
    backendStatus: backend?.status ?? "ukendt",
    frontendStatus: frontend?.status ?? "ukendt",
    logIssueCount: issues.length,
  })}`);
} catch (error) {
  console.error(`Runtime-smoke fejlede: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
