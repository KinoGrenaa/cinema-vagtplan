import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";

import {
  findStandaloneServer,
  startStandaloneServer,
} from "../frontend/scripts/start-container.mjs";

function withRoot(run) {
  const root = mkdtempSync(resolve(tmpdir(), "cinema-frontend-start-"));
  try {
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function write(path, content = "server") {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

test("standalone entrypoint findes i monorepo- og flad outputstruktur", () => {
  withRoot((root) => {
    const nested = resolve(root, "frontend", "server.js");
    write(nested);
    assert.equal(findStandaloneServer(root), nested);
  });
  withRoot((root) => {
    const flat = resolve(root, "server.js");
    write(flat);
    assert.equal(findStandaloneServer(root), flat);
  });
});

test("monorepo-entrypoint foretrækkes hvis begge findes", () => {
  withRoot((root) => {
    const nested = resolve(root, "frontend", "server.js");
    write(resolve(root, "server.js"));
    write(nested);
    assert.equal(findStandaloneServer(root), nested);
  });
});

test("manglende standalone-build giver handlingsklar fejl", () => {
  withRoot((root) => {
    assert.throws(
      () => startStandaloneServer({ root }),
      /docker compose up -d --build --force-recreate frontend/,
    );
  });
});

test("start bruger Node, serverens mappe og eksplicit host/port", () => {
  withRoot((root) => {
    const serverPath = resolve(root, "frontend", "server.js");
    write(serverPath);
    let invocation = null;
    const child = {
      once() {
        return child;
      },
    };
    const result = startStandaloneServer({
      root,
      spawnProcess(command, args, options) {
        invocation = { command, args, options };
        return child;
      },
    });
    assert.equal(result.serverPath, serverPath);
    assert.equal(invocation.command, process.execPath);
    assert.deepEqual(invocation.args, [serverPath]);
    assert.equal(invocation.options.cwd, dirname(serverPath));
    assert.equal(invocation.options.env.HOSTNAME.length > 0, true);
    assert.equal(invocation.options.env.PORT.length > 0, true);
    assert.equal(invocation.options.stdio, "inherit");
  });
});
