import { existsSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  collectProductionEnvProblems,
  readProductionEnvFile,
  summarizeProductionEnv,
} from "./production-env-lib.mjs";

const repoRoot = resolve(import.meta.dirname, "..");

export function parseProductionEnvArgs(args) {
  const options = {
    envFile: resolve(repoRoot, ".env.production"),
    allowHttp: false,
    skipGitSafety: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--env-file") {
      const value = args[index + 1];
      if (!value) throw new Error("--env-file kræver en sti.");
      options.envFile = resolve(value);
      index += 1;
    } else if (argument === "--allow-http") {
      options.allowHttp = true;
    } else if (argument === "--skip-git-safety") {
      options.skipGitSafety = true;
    } else if (argument === "--help") {
      options.help = true;
    } else {
      throw new Error(`Ukendt argument: ${argument}`);
    }
  }
  return options;
}

function gitStatus(args) {
  return spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
}

export function collectEnvFileSafetyProblems(envPath, options = {}) {
  if (options.skipGitSafety) return [];
  const problems = [];
  const relativePath = relative(repoRoot, envPath).replaceAll("\\", "/");
  if (!relativePath || relativePath.startsWith("../")) {
    problems.push("Produktions-env-filen skal ligge under repository-roden, så Git-sikkerheden kan kontrolleres.");
    return problems;
  }

  const tracked = gitStatus(["ls-files", "--error-unmatch", "--", relativePath]);
  if (tracked.status === 0) problems.push("Produktions-env-filen er tracket af Git og kan afsløre secrets.");

  const ignored = gitStatus(["check-ignore", "--quiet", "--", relativePath]);
  if (ignored.status !== 0) problems.push("Produktions-env-filen er ikke dækket af .gitignore.");

  if (process.platform !== "win32") {
    const mode = statSync(envPath).mode & 0o777;
    if ((mode & 0o077) !== 0) {
      problems.push(`Produktions-env-filen er for bredt læsbar (${mode.toString(8)}); brug chmod 600.`);
    }
  }
  return problems;
}

export function validateProductionEnvFile(options) {
  if (!existsSync(options.envFile)) {
    return { problems: [`Produktions-env-filen findes ikke: ${options.envFile}`], values: null };
  }
  try {
    const { values } = readProductionEnvFile(options.envFile);
    const problems = [
      ...collectProductionEnvProblems(values, { allowHttp: options.allowHttp }),
      ...collectEnvFileSafetyProblems(options.envFile, options),
    ];
    return { problems, values };
  } catch (error) {
    return { problems: [error instanceof Error ? error.message : String(error)], values: null };
  }
}

function printHelp() {
  console.log(`Kontrollér production secrets og miljøkonfiguration\n\nBrug:\n  npm run check:production-env -- --env-file .env.production\n\nTil lokal, isoleret kontrol kan --allow-http bruges. --skip-git-safety er kun til testfixtures.`);
}

export function runProductionEnvCheck(args = process.argv.slice(2)) {
  let options;
  try {
    options = parseProductionEnvArgs(args);
  } catch (error) {
    console.error(`Production-env-kontrol fejlede: ${error.message}`);
    return 2;
  }
  if (options.help) {
    printHelp();
    return 0;
  }

  const { problems, values } = validateProductionEnvFile(options);
  if (problems.length > 0) {
    console.error("Production-env-kontrol fejlede:\n");
    for (const problem of problems) console.error(`- ${problem}`);
    return 1;
  }

  const summary = summarizeProductionEnv(values);
  console.log("Production-env-kontrol OK.");
  console.log(`Offentlig origin: ${summary.appOrigin}`);
  console.log(`Caddy site: ${summary.caddySiteAddress}`);
  console.log(`PostgreSQL: ${summary.postgresUser}@${summary.postgresDatabase}`);
  console.log(`Secrets: PostgreSQL ${summary.postgresPasswordLength} tegn, JWT ${summary.jwtSecretLength} tegn`);
  console.log(`VAPID: ${summary.vapidConfigured ? "konfigureret" : "ikke konfigureret"}`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runProductionEnvCheck();
}
