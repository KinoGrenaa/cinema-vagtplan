import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const appRoot = "/app";
const testRoot = "/tests";
const serverCandidates = [
  resolve(appRoot, "frontend", "server.js"),
  resolve(appRoot, "server.js"),
];
const serverPath = serverCandidates.find((candidate) =>
  existsSync(candidate),
);

if (!serverPath) {
  console.error(
    `Frontend-flowtests kunne ikke finde standalone server.js. Kontroller Docker target flow-tests.`,
  );
  process.exit(1);
}

const server = spawn(process.execPath, [serverPath], {
  cwd: resolve(serverPath, ".."),
  env: {
    ...process.env,
    HOSTNAME: "127.0.0.1",
    PORT: "3000",
    NODE_ENV: "production",
  },
  stdio: "inherit",
});

let stopping = false;
function stopServer() {
  if (stopping) return;
  stopping = true;
  if (!server.killed) server.kill("SIGTERM");
}

process.on("SIGINT", () => {
  stopServer();
  process.exit(130);
});
process.on("SIGTERM", () => {
  stopServer();
  process.exit(143);
});

async function waitForFrontend() {
  const deadline = Date.now() + 60_000;
  let lastError = null;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(
        `Standalone-frontenden stoppede før flowtestene med exit code ${server.exitCode}.`,
      );
    }

    try {
      const response = await fetch("http://127.0.0.1:3000/");
      if (response.status < 500) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }

  throw new Error(
    `Standalone-frontenden blev ikke klar inden for 60 sekunder: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

try {
  await waitForFrontend();
  rmSync(resolve(testRoot, "test-results", "flows"), {
    recursive: true,
    force: true,
  });
  console.log("Standalone-frontend klar. Starter kritiske browser-flowtests.");

  const playwrightCli = resolve(
    testRoot,
    "node_modules",
    "@playwright",
    "test",
    "cli.js",
  );
  const testProcess = spawn(
    process.execPath,
    [playwrightCli, "test", "--config=./playwright.config.ts"],
    {
      cwd: testRoot,
      env: {
        ...process.env,
        CI: "true",
        FRONTEND_FLOW_BASE_URL: "http://127.0.0.1:3000",
      },
      stdio: "inherit",
    },
  );

  const exitCode = await new Promise((resolveExit) => {
    testProcess.once("error", (error) => {
      console.error(`Kunne ikke starte Playwright: ${error.message}`);
      resolveExit(1);
    });
    testProcess.once("exit", (code, signal) => {
      if (signal) {
        console.error(`Playwright stoppede med signal ${signal}.`);
        resolveExit(1);
        return;
      }
      resolveExit(code ?? 1);
    });
  });

  stopServer();
  process.exit(exitCode);
} catch (error) {
  stopServer();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
