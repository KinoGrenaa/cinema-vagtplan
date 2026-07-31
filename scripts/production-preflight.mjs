import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  parseProductionEnvArgs,
  validateProductionEnvFile,
} from "./check-production-env.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const composeFile = resolve(repoRoot, "docker-compose.production.yml");
const caddyfile = resolve(repoRoot, "deploy", "Caddyfile");

export function parseProductionPreflightArgs(args) {
  const passthrough = [];
  let allowDirty = false;
  let skipCaddyValidation = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--allow-dirty") allowDirty = true;
    else if (argument === "--skip-caddy-validation") skipCaddyValidation = true;
    else {
      passthrough.push(argument);
      if (argument === "--env-file") {
        passthrough.push(args[index + 1]);
        index += 1;
      }
    }
  }
  return {
    ...parseProductionEnvArgs(passthrough),
    allowDirty,
    skipCaddyValidation,
  };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: options.env ?? process.env,
    encoding: "utf8",
    stdio: options.inherit ? "inherit" : "pipe",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) throw new Error(`Kunne ikke starte ${command}: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(`${command} ${args.join(" ")} fejlede med exitkode ${result.status}${detail ? `: ${detail}` : ""}`);
  }
  return result;
}

export function buildProductionComposeArgs(envFile, ...args) {
  return ["compose", "--env-file", envFile, "-f", composeFile, ...args];
}

export function buildCaddyValidateArgs(values) {
  return [
    "run",
    "--rm",
    "-e",
    `CADDY_SITE_ADDRESS=${values.CADDY_SITE_ADDRESS}`,
    "-e",
    `CADDY_ACME_EMAIL=${values.CADDY_ACME_EMAIL}`,
    "-v",
    `${caddyfile.replaceAll("\\", "/")}:/etc/caddy/Caddyfile:ro`,
    "caddy:2.11.4-alpine",
    "caddy",
    "validate",
    "--config",
    "/etc/caddy/Caddyfile",
    "--adapter",
    "caddyfile",
  ];
}

function printHelp() {
  console.log(`Production-preflight\n\nBrug:\n  npm run production:preflight -- --env-file .env.production\n\nPreflight validerer secrets, Git-sikkerhed, Compose-konfiguration og Caddyfile uden at starte produktionsstacken. --allow-dirty og --allow-http er kun til isoleret udviklingskontrol.`);
}

export function runProductionPreflight(args = process.argv.slice(2)) {
  let options;
  try {
    options = parseProductionPreflightArgs(args);
  } catch (error) {
    console.error(`Production-preflight fejlede: ${error.message}`);
    return 2;
  }
  if (options.help) {
    printHelp();
    return 0;
  }

  const validation = validateProductionEnvFile(options);
  if (validation.problems.length > 0) {
    console.error("Production-preflight fejlede:\n");
    for (const problem of validation.problems) console.error(`- ${problem}`);
    return 1;
  }

  try {
    if (!existsSync(composeFile)) throw new Error("docker-compose.production.yml mangler.");
    if (!existsSync(caddyfile)) throw new Error("deploy/Caddyfile mangler.");

    if (!options.allowDirty) {
      const status = run("git", ["status", "--porcelain", "--untracked-files=normal"]);
      if (status.stdout.trim()) {
        throw new Error("Working tree er ikke ren. Commit eller fjern lokale ændringer før produktionsdeployment.");
      }
    }

    run(process.execPath, [resolve(repoRoot, "scripts", "check-production-compose.mjs")], { inherit: true });

    const composeEnvironment = {
      ...process.env,
      PRODUCTION_ENV_FILE: options.envFile.replaceAll("\\", "/"),
    };
    run("docker", buildProductionComposeArgs(options.envFile, "config", "--quiet"), {
      env: composeEnvironment,
    });

    if (!options.skipCaddyValidation) {
      run("docker", buildCaddyValidateArgs(validation.values), { inherit: true });
    }

    console.log("Production-preflight OK.");
    console.log("Secrets, Git-sikkerhed, Compose og Caddyfile er valideret.");
    console.log("Produktionsstacken blev ikke startet eller ændret.");
    return 0;
  } catch (error) {
    console.error(`Production-preflight fejlede: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runProductionPreflight();
}
