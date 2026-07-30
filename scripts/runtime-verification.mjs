export const DEFAULT_RUNTIME_OPTIONS = Object.freeze({
  backendUrl: "http://localhost:3001/",
  frontendUrl: "http://localhost:3000/",
  intervalMs: 2_000,
  timeoutMs: 120_000,
});

const expectedRestartNoise = [
  /npm error path \/app/i,
  /npm error command failed/i,
  /npm error signal SIGTERM/i,
  /npm error command sh -c (?:nest start --watch|next dev|node \.\/scripts\/start-container\.mjs)/i,
  /A complete log of this run can be found/i,
];
const fatalRuntimePatterns = [
  /UnhandledPromiseRejection/i,
  /uncaught exception/i,
  /\bFATAL\b/i,
  /EADDRINUSE/i,
  /PrismaClientInitializationError/i,
  /Nest can't resolve dependencies/i,
  /Failed to compile/i,
  /Type error:/i,
  /SyntaxError:/i,
  /ERR_MODULE_NOT_FOUND/i,
  /MODULE_NOT_FOUND/i,
  /npm error/i,
];
function parsePositiveInteger(value, optionName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${optionName} skal være et positivt heltal.`);
  }
  return parsed;
}
function parseUrl(value, optionName) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${optionName} skal være en gyldig URL.`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${optionName} skal bruge http eller https.`);
  }
  return parsed.toString();
}

export function parseRuntimeArguments(argv) {
  const options = {
    ...DEFAULT_RUNTIME_OPTIONS,
    showLogs: false,
    since: null,
  };
  for (const argument of argv) {
    if (argument === "--show-logs") {
      options.showLogs = true;
      continue;
    }
    if (argument.startsWith("--backend-url=")) {
      options.backendUrl = parseUrl(argument.slice("--backend-url=".length), "--backend-url");
      continue;
    }
    if (argument.startsWith("--frontend-url=")) {
      options.frontendUrl = parseUrl(argument.slice("--frontend-url=".length), "--frontend-url");
      continue;
    }
    if (argument.startsWith("--timeout-ms=")) {
      options.timeoutMs = parsePositiveInteger(argument.slice("--timeout-ms=".length), "--timeout-ms");
      continue;
    }
    if (argument.startsWith("--interval-ms=")) {
      options.intervalMs = parsePositiveInteger(argument.slice("--interval-ms=".length), "--interval-ms");
      continue;
    }
    if (argument.startsWith("--since=")) {
      const value = argument.slice("--since=".length);
      const parsed = Date.parse(value);
      if (Number.isNaN(parsed)) throw new Error("--since skal være et gyldigt tidspunkt.");
      options.since = new Date(parsed).toISOString();
      continue;
    }
    throw new Error(`Ukendt runtime-parameter: ${argument}`);
  }
  if (options.intervalMs > options.timeoutMs) {
    throw new Error("--interval-ms må ikke være større end --timeout-ms.");
  }
  return options;
}

export function isAcceptableStatus(status, { acceptClientErrors = false } = {}) {
  const upperBound = acceptClientErrors ? 500 : 400;
  return Number.isInteger(status) && status >= 200 && status < upperBound;
}
export function validateProbe({
  acceptClientErrors = false,
  body = "",
  expectedText = null,
  status,
}) {
  if (!isAcceptableStatus(status, { acceptClientErrors })) {
    return `HTTP ${status}`;
  }
  if (expectedText && !body.includes(expectedText)) {
    return `svaret manglede teksten ${JSON.stringify(expectedText)}`;
  }
  return null;
}
export function findRuntimeLogIssues(logText) {
  const lines = String(logText ?? "").split(/\r?\n/);
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !expectedRestartNoise.some((pattern) => pattern.test(line)))
    .filter((line) => fatalRuntimePatterns.some((pattern) => pattern.test(line)));
}

export function formatRuntimeDuration(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "ukendt tid";
  if (milliseconds < 1_000) return `${Math.round(milliseconds)} ms`;
  return `${(milliseconds / 1_000).toFixed(1).replace(".", ",")} s`;
}

export function formatProbeProgress(results) {
  return results
    .map(({ label, error, readyAfterMs }) => {
      if (error) return `${label}: venter (${error})`;
      return `${label}: klar${Number.isFinite(readyAfterMs) ? ` efter ${formatRuntimeDuration(readyAfterMs)}` : ""}`;
    })
    .join(" · ");
}

export function buildRuntimeSummary({
  backendReadyMs,
  backendStatus,
  frontendReadyMs,
  frontendStatus,
  logIssueCount,
}) {
  return `Runtime-smoke OK: backend HTTP ${backendStatus} efter ${formatRuntimeDuration(backendReadyMs)}, frontend HTTP ${frontendStatus} efter ${formatRuntimeDuration(frontendReadyMs)}, ${logIssueCount} nye fatale logfejl.`;
}
