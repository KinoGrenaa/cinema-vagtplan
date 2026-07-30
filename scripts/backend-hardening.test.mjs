import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

import {
  collectBackendHardeningProblems,
  findForbiddenRuntimePackages,
} from "./check-backend-hardening.mjs";

const require = createRequire(import.meta.url);

const runtime = (version) => ({ version });
const development = (version) => ({ version, dev: true });

test("den aktuelle repository-tilstand opfylder backend-hardening", () => {
  assert.deepEqual(collectBackendHardeningProblems(), []);
});

test("runtime-kontrollen afviser de gamle ExcelJS- og Archiver-kaeder", () => {
  const lock = {
    packages: {
      "node_modules/inflight": runtime("1.0.6"),
      "node_modules/fstream": runtime("1.0.12"),
      "node_modules/archiver-utils": runtime("5.0.2"),
      "node_modules/glob": runtime("10.5.0"),
      "node_modules/readdir-glob": runtime("2.0.3"),
      "node_modules/minimatch": runtime("10.2.5"),
      "node_modules/brace-expansion": runtime("2.1.3"),
      "node_modules/uuid": runtime("8.3.2"),
      "node_modules/test-exclude/node_modules/glob": development("7.2.3"),
    },
  };

  const problems = findForbiddenRuntimePackages(lock);
  assert.equal(problems.length, 8);
  assert.ok(problems.some((value) => value.startsWith("inflight@1.0.6")));
  assert.ok(problems.some((value) => value.startsWith("archiver-utils@5.0.2")));
  assert.ok(problems.some((value) => value.startsWith("brace-expansion@2.1.3")));
  assert.ok(!problems.some((value) => value.includes("test-exclude")));
});

test("den rettede runtime-kaede accepteres", () => {
  const lock = {
    packages: {
      "node_modules/archiver-modern": runtime("8.0.0"),
      "node_modules/readdir-glob": runtime("3.0.0"),
      "node_modules/minimatch": runtime("10.2.6"),
      "node_modules/brace-expansion": runtime("5.0.8"),
      "node_modules/unzipper": runtime("0.12.3"),
      "node_modules/uuid": runtime("11.1.1"),
    },
  };
  assert.deepEqual(findForbiddenRuntimePackages(lock), []);
});

test("Archiver-adapteren bygger ExcelJS pipe-returvaerdien over foer Archiver normaliserer kilden", async () => {
  const { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { dirname, join } = await import("node:path");
  const vm = await import("node:vm");

  const root = mkdtempSync(join(tmpdir(), "archiver-compat-"));
  try {
    const adapterPath = join(root, "vendor", "archiver-compat", "index.cjs");
    const modernRoot = join(root, "node_modules", "archiver-modern");
    mkdirSync(dirname(adapterPath), { recursive: true });
    mkdirSync(modernRoot, { recursive: true });

    writeFileSync(
      join(modernRoot, "package.json"),
      JSON.stringify({
        name: "archiver-modern",
        version: "8.0.0-test",
        type: "module",
        exports: "./index.js",
      }),
    );
    writeFileSync(
      join(modernRoot, "index.js"),
      [
        'import { PassThrough } from "node:stream";',
        'function isStream(source) {',
        '  return source !== null && typeof source === "object"',
        '    && (source.writable || source.readable',
        '      || (source.writable === undefined && source.readable === undefined))',
        '    && typeof source.pipe === "function";',
        '}',
        'function normalizeInputSource(source) {',
        '  if (source === null) return Buffer.alloc(0);',
        '  if (typeof source === "string") return Buffer.from(source);',
        '  if (isStream(source)) return source.pipe(new PassThrough());',
        '  return source;',
        '}',
        'export class Archiver {}',
        'export class ZipArchive {',
        '  constructor(options) { this.options = options; }',
        '  append(source, data) {',
        '    const normalized = normalizeInputSource(source);',
        '    if (!Buffer.isBuffer(normalized) && !isStream(normalized)) {',
        '      const error = new Error("input source must be valid Stream or Buffer instance");',
        '      error.code = "INPUTSTEAMBUFFERREQUIRED";',
        '      throw error;',
        '    }',
        '    this.appendedSource = normalized;',
        '    this.appendedData = data;',
        '    return this;',
        '  }',
        '}',
        'export class TarArchive extends ZipArchive {}',
        'export class JsonArchive extends ZipArchive {}',
      ].join("\n"),
    );

    const source = readFileSync(
      new URL("../backend/vendor/archiver-compat/index.cjs", import.meta.url),
      "utf8",
    );
    writeFileSync(adapterPath, source);

    const wrapper = vm.runInNewContext(
      `(function (require, module, exports, __filename, __dirname) {${source}\n})`,
    );
    const module = { exports: {} };
    const jestLikeRequire = (specifier) => {
      if (specifier === "node:buffer") return require("node:buffer");
      if (specifier === "node:module") return require("node:module");
      if (specifier === "node:stream") return require("node:stream");
      throw new Error(`Jest-loaderen maa ikke indlaese ${specifier} direkte`);
    };

    wrapper(
      jestLikeRequire,
      module,
      module.exports,
      adapterPath,
      dirname(adapterPath),
    );

    const archive = module.exports("zip", { marker: "ok" });
    assert.equal(archive.constructor.name, "ZipArchive");
    assert.equal(archive.options.marker, "ok");

    const legacySource = new (require("node:events").EventEmitter)();
    legacySource.readable = true;
    legacySource.writable = true;
    legacySource.buffers = [];
    legacySource.pipes = [];
    legacySource.toBuffer = () => Buffer.alloc(0);
    legacySource.write = () => true;
    legacySource.end = () => {};
    legacySource.pipe = (destination) => {
      legacySource.pipes.push(destination);
      legacySource.destination = destination;
      return undefined;
    };

    archive.append(legacySource, { name: "xl/worksheets/sheet1.xml" });
    assert.notEqual(archive.appendedSource, legacySource);
    assert.equal(legacySource.destination.readable, true);
    assert.equal(legacySource.destination.writable, true);
    assert.equal(typeof archive.appendedSource.pipe, "function");
    assert.equal(archive.appendedData.name, "xl/worksheets/sheet1.xml");

    const chunks = [];
    archive.appendedSource.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    const ended = require("node:events").once(archive.appendedSource, "end");
    legacySource.destination.write(Buffer.from("xlsx-stream"));
    legacySource.destination.end();
    await ended;
    assert.equal(Buffer.concat(chunks).toString("utf8"), "xlsx-stream");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Jest-shimmet isolerer kun Archiver-streaming og fejler tydeligt ved brug", () => {
  const shim = require("../backend/test-support/archiver-jest-shim.cjs");
  assert.equal(typeof shim, "function");
  assert.throws(
    () => shim("zip"),
    (error) => error?.code === "ARCHIVER_JEST_ISOLATED",
  );
});


test("Docker-runtime installerer rent uden dev-, peer- og optional-only pakker", async () => {
  const { readFileSync } = await import("node:fs");
  const dockerfile = readFileSync(
    new URL("../backend/Dockerfile", import.meta.url),
    "utf8",
  );

  assert.match(dockerfile, /FROM base AS production-dependencies/);
  assert.match(dockerfile, /npm ci --omit=dev --omit=peer --omit=optional/);
  assert.match(
    dockerfile,
    /COPY --from=dependencies \/app\/node_modules\/\.prisma \.\/node_modules\/\.prisma/,
  );
  assert.doesNotMatch(dockerfile, /npm prune --omit=dev/);
});
