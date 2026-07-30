import assert from "node:assert/strict";
import test from "node:test";

import { resolveNpmInvocation } from "./release-command.mjs";

test("npm_execpath køres gennem den aktuelle Node-proces", () => {
  const invocation = resolveNpmInvocation({
    env: { npm_execpath: "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js" },
    platform: "win32",
    execPath: "C:\\Program Files\\nodejs\\node.exe",
  });

  assert.deepEqual(invocation, {
    command: "C:\\Program Files\\nodejs\\node.exe",
    argsPrefix: ["C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js"],
    shell: false,
  });
});

test("Windows-fallback bruger npm.cmd gennem shell", () => {
  const invocation = resolveNpmInvocation({
    env: {},
    platform: "win32",
    execPath: "C:\\Program Files\\nodejs\\node.exe",
  });

  assert.deepEqual(invocation, {
    command: "npm.cmd",
    argsPrefix: [],
    shell: true,
  });
});

test("POSIX-fallback bruger npm uden shell", () => {
  const invocation = resolveNpmInvocation({
    env: {},
    platform: "linux",
    execPath: "/usr/bin/node",
  });

  assert.deepEqual(invocation, {
    command: "npm",
    argsPrefix: [],
    shell: false,
  });
});
