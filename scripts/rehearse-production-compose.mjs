import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const repoRoot = resolve(import.meta.dirname, "..");
const composeFile = join(repoRoot, "docker-compose.production.yml");
const id = `${Date.now()}-${randomBytes(3).toString("hex")}`;
const project = `cinema-production-rehearsal-${id}`;
const workDirectory = join(repoRoot, "backups", `production-rehearsal-${id}`);
const envPath = join(workDirectory, ".env.production");

if (process.argv.slice(2).includes("--help")) {
  console.log(`Isoleret production Compose-rehearsal\n\nBrug:\n  npm run production:rehearse\n\nRehearsalen bruger et unikt Compose-projekt, tilfældige lokale porte, en tom PostgreSQL-database og separate Docker-volumes. Den aktive udviklingsstack ændres ikke.`);
  process.exit(0);
}
if (process.argv.length > 2) {
  console.error(`Ukendte argumenter: ${process.argv.slice(2).join(" ")}`);
  process.exit(2);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: options.env ?? process.env,
    encoding: "utf8",
    stdio: options.inherit ? "inherit" : "pipe",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw new Error(`Kunne ikke starte ${command}: ${result.error.message}`);
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(
      `${command} ${args.join(" ")} fejlede med exitkode ${result.status}: ${(result.stderr ?? "").trim()}`,
    );
  }
  return result;
}

function composeArgs(...args) {
  return [
    "compose",
    "--env-file",
    envPath,
    "-f",
    composeFile,
    "-p",
    project,
    ...args,
  ];
}

async function reserveTcpPort() {
  return await new Promise((resolvePort, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((error) => {
        if (error) reject(error);
        else if (!port) reject(new Error("Kunne ikke reservere en lokal port."));
        else resolvePort(port);
      });
    });
  });
}

async function waitFor(label, probe, timeoutMs = 180_000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const result = await probe();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await delay(1_000);
  }
  throw new Error(`${label} blev ikke klar inden ${Math.round(timeoutMs / 1000)} sekunder${lastError ? `: ${lastError.message}` : ""}`);
}

function getServiceContainerId(service) {
  const result = run("docker", composeArgs("ps", "-q", service));
  const ids = (result.stdout ?? "")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (ids.length !== 1) {
    throw new Error(
      `Forventede præcis én container for ${service}, men fandt ${ids.length}.`,
    );
  }

  return ids[0];
}

function assertNotPublished(service, port) {
  const containerId = getServiceContainerId(service);
  const result = run("docker", ["inspect", containerId]);

  let inspect;
  try {
    inspect = JSON.parse(result.stdout ?? "[]");
  } catch (error) {
    throw new Error(
      `Kunne ikke læse Docker-inspect for ${service}: ${error.message}`,
    );
  }

  const portKey = `${port}/tcp`;
  const bindings = inspect?.[0]?.HostConfig?.PortBindings?.[portKey];
  const publishedBindings = Array.isArray(bindings)
    ? bindings.filter((binding) => binding && (binding.HostIp || binding.HostPort))
    : bindings
      ? [bindings]
      : [];

  if (publishedBindings.length > 0) {
    const description = publishedBindings
      .map((binding) => `${binding.HostIp || "0.0.0.0"}:${binding.HostPort || "?"}`)
      .join(", ");
    throw new Error(`${service}:${port} er publiceret på ${description}.`);
  }
}

let rehearsalError = null;
let cleanupError = null;
try {
  run("docker", ["compose", "version"]);
  const httpPort = await reserveTcpPort();
  const httpsPort = await reserveTcpPort();
  const postgresPassword = randomBytes(24).toString("hex");
  const jwtSecret = randomBytes(48).toString("hex");
  mkdirSync(workDirectory, { recursive: true });
  writeFileSync(
    envPath,
    [
      `PRODUCTION_ENV_FILE=${envPath.replaceAll("\\", "/")}`,
      "APP_ORIGIN=http://127.0.0.1:" + httpPort,
      "CADDY_SITE_ADDRESS=:80",
      "CADDY_ACME_EMAIL=rehearsal@example.invalid",
      `HTTP_BIND=127.0.0.1:${httpPort}`,
      `HTTPS_BIND=127.0.0.1:${httpsPort}`,
      `HTTPS_UDP_BIND=127.0.0.1:${httpsPort}`,
      "POSTGRES_USER=cinema_rehearsal",
      `POSTGRES_PASSWORD=${postgresPassword}`,
      "POSTGRES_DB=cinema_rehearsal",
      `DATABASE_URL=postgresql://cinema_rehearsal:${postgresPassword}@database:5432/cinema_rehearsal?schema=public`,
      `JWT_SECRET=${jwtSecret}`,
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(`Starter isoleret production-rehearsal: ${project}`);
  run("docker", composeArgs("config", "--quiet"));
  run("docker", composeArgs("up", "-d", "--build"), { inherit: true });

  const baseUrl = `http://127.0.0.1:${httpPort}`;
  await waitFor("Production-proxy", async () => {
    const response = await fetch(`${baseUrl}/`, { headers: { Accept: "text/html" } });
    return response.status >= 200 && response.status < 400;
  });

  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (loginResponse.status !== 400) {
    throw new Error(`Login-proxy forventede HTTP 400 fra backend, men fik ${loginResponse.status}.`);
  }

  const socketResponse = await fetch(`${baseUrl}/socket.io/?EIO=4&transport=polling&t=${Date.now()}`);
  const socketBody = await socketResponse.text();
  if (socketResponse.status !== 200 || !socketBody.startsWith("0")) {
    throw new Error(`Socket.IO-proxy fejlede: HTTP ${socketResponse.status}, svar ${socketBody.slice(0, 80)}`);
  }

  assertNotPublished("database", "5432");
  assertNotPublished("backend", "3001");
  assertNotPublished("frontend", "3000");

  const marker = `production-rehearsal-${id}`;
  run("docker", composeArgs(
    "exec",
    "-T",
    "backend",
    "sh",
    "-lc",
    `mkdir -p /app/uploads && printf %s '${marker}' > /app/uploads/.production-rehearsal-marker`,
  ));
  run("docker", composeArgs("up", "-d", "--force-recreate", "backend"), { inherit: true });

  await waitFor("Backend efter recreate", async () => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    return response.status === 400;
  });

  const markerResult = run("docker", composeArgs(
    "exec",
    "-T",
    "backend",
    "cat",
    "/app/uploads/.production-rehearsal-marker",
  ));
  if ((markerResult.stdout ?? "").trim() !== marker) {
    throw new Error("Uploadvolumet bevarede ikke markøren efter backend-recreate.");
  }
  run("docker", composeArgs(
    "exec",
    "-T",
    "backend",
    "rm",
    "-f",
    "/app/uploads/.production-rehearsal-marker",
  ));

  console.log("Production Compose-rehearsal OK.");
  console.log("Frontend, API og Socket.IO svarede gennem Caddy.");
  console.log("Database-, backend- og frontendporte var ikke publiceret.");
  console.log("Det persistente uploadvolume overlevede backend-recreate.");
} catch (error) {
  rehearsalError = error;
} finally {
  const down = run("docker", composeArgs("down", "-v", "--remove-orphans"), { allowFailure: true });
  if (down.status !== 0) {
    cleanupError = new Error(`Oprydning fejlede: ${(down.stderr ?? "").trim()}`);
  }
  if (existsSync(workDirectory)) rmSync(workDirectory, { recursive: true, force: true });

  const containers = run("docker", [
    "ps",
    "-a",
    "--filter",
    `label=com.docker.compose.project=${project}`,
    "--format",
    "{{.Names}}",
  ], { allowFailure: true });
  const volumes = run("docker", [
    "volume",
    "ls",
    "--filter",
    `label=com.docker.compose.project=${project}`,
    "--format",
    "{{.Name}}",
  ], { allowFailure: true });
  if ((containers.stdout ?? "").trim() || (volumes.stdout ?? "").trim()) {
    cleanupError = new Error("Production-rehearsalen efterlod Docker-ressourcer.");
  }
}

if (rehearsalError || cleanupError) {
  console.error(
    `Production Compose-rehearsal fejlede: ${
      rehearsalError instanceof Error
        ? rehearsalError.message
        : cleanupError instanceof Error
          ? cleanupError.message
          : String(rehearsalError ?? cleanupError)
    }`,
  );
  process.exit(1);
}
