import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const backendRoot = resolve(dirname(currentFile), "..");

export function resolveNpmInvocation(
  environment = process.env,
  nodeExecutable = process.execPath,
) {
  const npmExecPath = environment.npm_execpath?.trim();
  if (!npmExecPath) {
    throw new Error(
      "npm_execpath mangler. Koer rapporten via 'npm run audit:report'.",
    );
  }

  return {
    command: nodeExecutable,
    argsPrefix: [npmExecPath],
  };
}

function runAudit(args) {
  const npmInvocation = resolveNpmInvocation();
  const result = spawnSync(
    npmInvocation.command,
    [...npmInvocation.argsPrefix, "audit", "--json", ...args],
    {
      cwd: backendRoot,
      encoding: "utf8",
      shell: false,
      maxBuffer: 20 * 1024 * 1024,
    },
  );

  if (result.error) throw result.error;

  const output = result.stdout?.trim();
  if (!output) {
    throw new Error(
      `npm audit returnerede ingen JSON. ${result.stderr?.trim() ?? ""}`.trim(),
    );
  }

  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`Kunne ikke parse npm audit JSON: ${error.message}`);
  }
}

function counts(report) {
  const value = report?.metadata?.vulnerabilities ?? {};
  return {
    low: Number(value.low ?? 0),
    moderate: Number(value.moderate ?? 0),
    high: Number(value.high ?? 0),
    critical: Number(value.critical ?? 0),
    total: Number(value.total ?? 0),
  };
}

export function createAuditSummary(productionReport, completeReport) {
  const production = counts(productionReport);
  const complete = counts(completeReport);

  if (production.total !== 0) {
    throw new Error(`Produktionaudit har stadig ${production.total} fund.`);
  }

  return {
    production,
    complete,
    developmentOnly: Math.max(0, complete.total - production.total),
  };
}

export function main() {
  try {
    const summary = createAuditSummary(
      runAudit(["--omit=dev"]),
      runAudit([]),
    );

    console.log("Backend auditrapport:");
    console.log(`- Runtime: ${summary.production.total}`);
    console.log(
      `- Samlet: ${summary.complete.total} (low ${summary.complete.low}, moderate ${summary.complete.moderate}, high ${summary.complete.high}, critical ${summary.complete.critical})`,
    );
    console.log(`- Dev-only: ${summary.developmentOnly}`);
    console.log(
      "Dev-only fund vises og foelges, men leveres ikke i multi-stage runtime-imaget.",
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  main();
}
