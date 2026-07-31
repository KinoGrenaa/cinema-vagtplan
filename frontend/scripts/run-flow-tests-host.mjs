import { spawn } from "node:child_process";
import { resolve } from "node:path";

const frontendRoot = resolve(import.meta.dirname, "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const port = process.env.FRONTEND_FLOW_PORT || "3100";
const baseUrl = `http://127.0.0.1:${port}`;

const server = spawn(
  npmCommand,
  ["run", "start", "--", "--hostname", "127.0.0.1", "--port", port],
  {
    cwd: frontendRoot,
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: port,
    },
    stdio: "inherit",
    shell: false,
  },
);

let stopping = false;
function stopServer() {
  if (stopping) return;
  stopping = true;
  if (!server.killed) server.kill("SIGTERM");
}

async function waitForFrontend() {
  const deadline = Date.now() + 60_000;
  let lastError = null;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(
        `Frontend-serveren stoppede før flowtestene med exit code ${server.exitCode}.`,
      );
    }

    try {
      const response = await fetch(baseUrl);
      if (response.status < 500) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }

  throw new Error(
    `Frontend-serveren blev ikke klar inden for 60 sekunder: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

try {
  await waitForFrontend();
  const testProcess = spawn(
    npmCommand,
    ["run", "test:flows"],
    {
      cwd: frontendRoot,
      env: {
        ...process.env,
        FRONTEND_FLOW_BASE_URL: baseUrl,
        FLOW_TEST_BROWSER_CHANNEL:
          process.env.FLOW_TEST_BROWSER_CHANNEL || "chrome",
      },
      stdio: "inherit",
      shell: false,
    },
  );

  const exitCode = await new Promise((resolveExit) => {
    testProcess.once("error", (error) => {
      console.error(`Kunne ikke starte browser-flowtestene: ${error.message}`);
      resolveExit(1);
    });
    testProcess.once("exit", (code, signal) => {
      if (signal) {
        console.error(`Browser-flowtestene stoppede med signal ${signal}.`);
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
