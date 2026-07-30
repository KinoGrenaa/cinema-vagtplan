"use strict";

const { Buffer } = require("node:buffer");
const { createRequire } = require("node:module");
const { PassThrough } = require("node:stream");

// Jest executes CommonJS modules with its own virtual `require`. That loader
// cannot synchronously load Archiver 8's ESM entry point. Use a native require
// rooted at this package so production and direct Node regression tests load
// the real ESM implementation through Node itself.
const nativeRequire = createRequire(__filename);
const modern = nativeRequire("archiver-modern");

const archiveTypes = new Map([
  ["zip", modern.ZipArchive],
  ["tar", modern.TarArchive],
  ["json", modern.JsonArchive],
]);

function archiverAcceptsStream(source) {
  return (
    source !== null &&
    typeof source === "object" &&
    (source.writable ||
      source.readable ||
      (source.writable === undefined && source.readable === undefined)) &&
    typeof source.pipe === "function"
  );
}

function isLegacyPipeSource(source) {
  return (
    source !== null &&
    typeof source === "object" &&
    !Buffer.isBuffer(source) &&
    typeof source.pipe === "function" &&
    typeof source.on === "function"
  );
}

function bridgeLegacyPipeSource(source) {
  const bridge = new PassThrough();
  const onError = (error) => bridge.destroy(error);

  source.on("error", onError);
  bridge.once("close", () => {
    if (typeof source.removeListener === "function") {
      source.removeListener("error", onError);
    }
  });

  source.pipe(bridge);
  return bridge;
}

function isExcelJsStreamBuf(source) {
  return (
    isLegacyPipeSource(source) &&
    Array.isArray(source.buffers) &&
    Array.isArray(source.pipes) &&
    typeof source.toBuffer === "function" &&
    typeof source.write === "function" &&
    typeof source.end === "function" &&
    source._readableState === undefined &&
    source._writableState === undefined
  );
}

function normalizeAppendSource(source) {
  // ExcelJS 4's StreamBuf passes Archiver's initial is-stream check because it
  // exposes readable/writable and pipe(). Its custom pipe() only registers the
  // destination, however, and deliberately returns undefined. Archiver 8 then
  // normalizes accepted streams with source.pipe(new PassThrough()) and treats
  // that undefined return value as the input source. Bridge StreamBuf before
  // Archiver performs that normalization so the next pipe() obeys Node's normal
  // contract and returns its destination.
  if (isExcelJsStreamBuf(source)) {
    return bridgeLegacyPipeSource(source);
  }

  if (
    source === null ||
    typeof source === "string" ||
    Buffer.isBuffer(source) ||
    archiverAcceptsStream(source)
  ) {
    return source;
  }

  // Retain a conservative fallback for older non-standard pipe sources that do
  // not satisfy Archiver's stream predicate at all.
  if (isLegacyPipeSource(source)) {
    return bridgeLegacyPipeSource(source);
  }

  return source;
}

function createArchiver(format, options) {
  const normalized = String(format ?? "").toLowerCase();
  const Archive = archiveTypes.get(normalized);
  if (!Archive) {
    const error = new Error(`Unknown archive format: ${format}`);
    error.code = "FORMAT_UNKNOWN";
    throw error;
  }

  const archive = new Archive(options);
  const append = archive.append.bind(archive);
  archive.append = (source, data) => append(normalizeAppendSource(source), data);
  return archive;
}

createArchiver.create = createArchiver;
createArchiver.Archiver = modern.Archiver;
createArchiver.ZipArchive = modern.ZipArchive;
createArchiver.TarArchive = modern.TarArchive;
createArchiver.JsonArchive = modern.JsonArchive;
createArchiver.isRegisteredFormat = (format) =>
  archiveTypes.has(String(format ?? "").toLowerCase());
createArchiver.registerFormat = () => {
  throw new Error(
    "Custom archive formats are not supported by the ExcelJS compatibility adapter.",
  );
};

module.exports = createArchiver;
