import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const frontendRoot = resolve(dirname(currentFile), "..");

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

  return new Promise((resolveAudit, rejectAudit) => {
    const child = spawn(
      npmInvocation.command,
      [...npmInvocation.argsPrefix, "audit", "--json", ...args],
      {
        cwd: frontendRoot,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", rejectAudit);
    child.on("close", () => {
      const output = stdout.trim();
      if (!output) {
        rejectAudit(
          new Error(
            `npm audit returnerede ingen JSON. ${stderr.trim()}`.trim(),
          ),
        );
        return;
      }

      try {
        resolveAudit(JSON.parse(output));
      } catch (error) {
        rejectAudit(
          new Error(
            `Kunne ikke parse npm audit JSON: ${error.message}`,
          ),
        );
      }
    });
  });
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
    throw new Error(`Frontendens produktionaudit har stadig ${production.total} fund.`);
  }
  return {
    production,
    complete,
    developmentOnly: Math.max(0, complete.total - production.total),
  };
}

export async function main() {
  try {
    const [productionReport, completeReport] =
      await Promise.all([
        runAudit(["--omit=dev"]),
        runAudit([]),
      ]);
    const summary = createAuditSummary(
      productionReport,
      completeReport,
    );
    console.log("Frontend auditrapport:");
    console.log(`- Runtime: ${summary.production.total}`);
    console.log(
      `- Samlet: ${summary.complete.total} (low ${summary.complete.low}, moderate ${summary.complete.moderate}, high ${summary.complete.high}, critical ${summary.complete.critical})`,
    );
    console.log(`- Dev-only: ${summary.developmentOnly}`);
    console.log(
      "Dev-only fund vises og foelges, men leveres ikke i standalone runtime-imaget.",
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  await main();
}
