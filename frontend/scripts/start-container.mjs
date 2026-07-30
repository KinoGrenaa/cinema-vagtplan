import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const currentFile = fileURLToPath(import.meta.url);

export function findStandaloneServer(root = "/app") {
  const candidates = [
    resolve(root, "frontend", "server.js"),
    resolve(root, "server.js"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

export function startStandaloneServer({ root = "/app", spawnProcess = spawn } = {}) {
  const serverPath = findStandaloneServer(root);
  if (!serverPath) {
    throw new Error(
      "Next.js standalone-server mangler. Genopbyg frontend-imaget med `docker compose up -d --build --force-recreate frontend`.",
    );
  }

  const child = spawnProcess(process.execPath, [serverPath], {
    cwd: dirname(serverPath),
    env: {
      ...process.env,
      HOSTNAME: process.env.FRONTEND_HOSTNAME || "0.0.0.0",
      PORT: process.env.PORT || "3000",
    },
    stdio: "inherit",
  });

  child.once("error", (error) => {
    console.error(`Frontend-serveren kunne ikke startes: ${error.message}`);
    process.exitCode = 1;
  });
  child.once("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exitCode = code ?? 1;
  });

  return { child, serverPath };
}

if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  try {
    const { serverPath } = startStandaloneServer();
    console.log(`Starter frontend fra ${serverPath}.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
