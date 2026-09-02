import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");

const expectedDirectVersions = {
  "@nestjs/common": "11.1.28",
  "@nestjs/core": "11.1.28",
  "@nestjs/platform-express": "11.1.28",
  "@nestjs/platform-socket.io": "11.1.28",
  "@nestjs/websockets": "11.1.28",
  archiver: "file:vendor/archiver-compat",
  multer: "2.2.0",
  rxjs: "7.8.2",
};

const expectedExcelJsOverrides = {
  archiver: "$archiver",
  unzipper: "0.12.3",
  uuid: "11.1.1",
};

const expectedSecurityOverrides = {
  "body-parser": "2.3.0",
  multer: "2.2.0",
  qs: "6.16.0",
  tmp: "0.2.7",
  ws: "8.21.1",
};

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function packageNameFromLockPath(lockPath) {
  const normalized = lockPath.replaceAll("\\", "/");
  const marker = "node_modules/";
  const index = normalized.lastIndexOf(marker);
  return index < 0 ? null : normalized.slice(index + marker.length);
}

function parseVersion(version) {
  const match = String(version ?? "").match(/^(\d+)\.(\d+)\.(\d+)/);
  return match ? match.slice(1).map(Number) : null;
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) return null;
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return 0;
}

function isRuntimePackage(metadata) {
  return metadata?.dev !== true && metadata?.devOptional !== true;
}

function lockEntries(lock, packageName, runtimeOnly = false) {
  return Object.entries(lock.packages ?? {})
    .filter(([lockPath, metadata]) =>
      packageNameFromLockPath(lockPath) === packageName &&
      metadata?.version &&
      (!runtimeOnly || isRuntimePackage(metadata)),
    )
    .map(([lockPath, metadata]) => ({ lockPath, version: metadata.version }));
}

export function findForbiddenRuntimePackages(lock) {
  const problems = [];
  for (const [lockPath, metadata] of Object.entries(lock.packages ?? {})) {
    const name = packageNameFromLockPath(lockPath);
    if (!name || !metadata?.version || !isRuntimePackage(metadata)) continue;

    const version = metadata.version;
    const major = parseVersion(version)?.[0] ?? null;
    if (name === "inflight" || name === "fstream" || name === "archiver-utils") {
      problems.push(`${name}@${version} (${lockPath})`);
    } else if (name === "rimraf" && major !== null && major < 4) {
      problems.push(`${name}@${version} (${lockPath})`);
    } else if (name === "glob") {
      problems.push(`${name}@${version} (${lockPath})`);
    } else if (name === "uuid" && major !== null && major <= 10) {
      problems.push(`${name}@${version} (${lockPath})`);
    } else if (name === "body-parser" && compareVersions(version, "2.3.0") < 0) {
      problems.push(`${name}@${version} (${lockPath})`);
    } else if (name === "multer" && compareVersions(version, "2.2.0") < 0) {
      problems.push(`${name}@${version} (${lockPath})`);
    } else if (name === "qs" && compareVersions(version, "6.16.0") < 0) {
      problems.push(`${name}@${version} (${lockPath})`);
    } else if (name === "tmp" && compareVersions(version, "0.2.6") < 0) {
      problems.push(`${name}@${version} (${lockPath})`);
    } else if (name === "ws" && major === 8 && compareVersions(version, "8.20.2") < 0) {
      problems.push(`${name}@${version} (${lockPath})`);
    } else if (name === "readdir-glob" && compareVersions(version, "3.0.0") < 0) {
      problems.push(`${name}@${version} (${lockPath})`);
    } else if (name === "minimatch" && compareVersions(version, "10.2.6") < 0) {
      problems.push(`${name}@${version} (${lockPath})`);
    } else if (name === "brace-expansion" && compareVersions(version, "5.0.9") < 0) {
      problems.push(`${name}@${version} (${lockPath})`);
    }
  }
  return problems.sort();
}

function collectFiles(directory, predicate) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(path, predicate));
    else if (predicate(path)) files.push(path);
  }
  return files;
}

export function collectBackendHardeningProblems(root = repoRoot) {
  const problems = [];
  const backendRoot = resolve(root, "backend");
  const packagePath = resolve(backendRoot, "package.json");
  const lockPath = resolve(backendRoot, "package-lock.json");
  const dockerfilePath = resolve(backendRoot, "Dockerfile");
  const composePath = resolve(root, "docker-compose.yml");
  const adapterPackagePath = resolve(backendRoot, "vendor", "archiver-compat", "package.json");
  const adapterSourcePath = resolve(backendRoot, "vendor", "archiver-compat", "index.cjs");
  const jestShimPath = resolve(backendRoot, "test-support", "archiver-jest-shim.cjs");
  const streamingCheckPath = resolve(backendRoot, "scripts", "check-exceljs-streaming.mjs");
  const e2eConfigPath = resolve(backendRoot, "test", "jest-e2e.json");
  const releasePath = resolve(root, "scripts", "run-release-checks.mjs");
  const workflowPath = resolve(root, ".github", "workflows", "release-checks.yml");

  for (const path of [packagePath, lockPath, dockerfilePath, composePath, adapterPackagePath, adapterSourcePath, jestShimPath, streamingCheckPath, e2eConfigPath, releasePath, workflowPath]) {
    if (!existsSync(path)) problems.push(`Mangler ${path.slice(root.length + 1)}`);
  }
  if (problems.length > 0) return problems;

  const packageJson = readJson(packagePath);
  const lock = readJson(lockPath);
  const adapterPackage = readJson(adapterPackagePath);
  const e2eConfig = readJson(e2eConfigPath);
  if (lock.lockfileVersion !== 3) {
    problems.push(`backend/package-lock.json skal bruge lockfileVersion 3, men bruger ${lock.lockfileVersion}.`);
  }

  for (const [name, expected] of Object.entries(expectedDirectVersions)) {
    if (packageJson.dependencies?.[name] !== expected) {
      problems.push(`Direkte dependency ${name} skal være ${expected}, men er ${packageJson.dependencies?.[name] ?? "manglende"}.`);
    }
  }

  for (const [name, expected] of Object.entries(expectedExcelJsOverrides)) {
    if (packageJson.overrides?.exceljs?.[name] !== expected) {
      problems.push(`ExcelJS override ${name} skal være ${expected}.`);
    }
  }
  if (packageJson.overrides?.["readdir-glob"]?.minimatch !== "10.2.6") {
    problems.push("readdir-glob skal resolve minimatch@10.2.6.");
  }
  for (const [name, expected] of Object.entries(expectedSecurityOverrides)) {
    if (packageJson.overrides?.[name] !== expected) {
      problems.push(`Sikkerhedsoverride ${name} skal være ${expected}.`);
    }
  }
  if (Object.hasOwn(packageJson.overrides ?? {}, "form-data")) {
    problems.push("form-data maa ikke have en kunstig runtime-overrride, naar pakken ikke findes i runtime-traeet.");
  }

  const expectedJestArchiverMapper = "<rootDir>/../test-support/archiver-jest-shim.cjs";
  if (packageJson.jest?.moduleNameMapper?.["^archiver$"] !== expectedJestArchiverMapper) {
    problems.push("Unit-testkonfigurationen skal isolere archiver fra Jest-loaderen.");
  }
  if (e2eConfig.moduleNameMapper?.["^archiver$"] !== expectedJestArchiverMapper) {
    problems.push("E2E-testkonfigurationen skal isolere archiver fra Jest-loaderen.");
  }
  const xlsxHardeningScript = packageJson.scripts?.["test:xlsx-hardening"] ?? "";
  if (!xlsxHardeningScript.includes("payroll-xlsx-export.spec.ts") || !xlsxHardeningScript.includes("check-exceljs-streaming.mjs")) {
    problems.push("backend/package.json mangler den samlede XLSX-hardening-test.");
  }

  const jestShimSource = readFileSync(jestShimPath, "utf8");
  if (!jestShimSource.includes("ARCHIVER_JEST_ISOLATED") || !jestShimSource.includes("module.exports = unavailableInJest")) {
    problems.push("Jest-shimmet for archiver har ikke den forventede fail-fast-kontrakt.");
  }
  const streamingCheckSource = readFileSync(streamingCheckPath, "utf8");
  for (const marker of [
    "ExcelJS.stream.xlsx.WorkbookWriter",
    "await workbook.commit()",
    "ExcelJS streaming writer and Archiver compatibility adapter OK.",
  ]) {
    if (!streamingCheckSource.includes(marker)) problems.push(`Streaming-regressionen mangler: ${marker}`);
  }

  if (adapterPackage.name !== "@kino-grenaa/archiver-compat" || adapterPackage.version !== "1.0.0") {
    problems.push("Archiver-kompatibilitetsadapteren har forkert navn eller version.");
  }
  if (adapterPackage.dependencies?.["archiver-modern"] !== "npm:archiver@8.0.0") {
    problems.push("Archiver-kompatibilitetsadapteren skal bruge archiver@8.0.0.");
  }
  const adapterSource = readFileSync(adapterSourcePath, "utf8");
  for (const marker of [
    "createRequire(__filename)",
    "nativeRequire(\"archiver-modern\")",
    "new Archive(options)",
    "new PassThrough()",
    "isExcelJsStreamBuf(source)",
    "normalizeAppendSource(source)",
    "archive.append = (source, data)",
    "module.exports = createArchiver",
  ]) {
    if (!adapterSource.includes(marker)) problems.push(`Archiver-adapteren mangler kontraktmarkoeren: ${marker}`);
  }
  if (/const\s+modern\s*=\s*require\(["']archiver-modern["']\)/.test(adapterSource)) {
    problems.push("Archiver-adapteren maa ikke bruge Jest-loaderens direkte require af archiver-modern.");
  }

  const rootLock = lock.packages?.[""];
  if (rootLock?.dependencies?.archiver !== "file:vendor/archiver-compat") {
    problems.push("Lockfilens root skal pege archiver paa den lokale kompatibilitetsadapter.");
  }
  const adapterLink = lock.packages?.["node_modules/archiver"];
  if (adapterLink?.link !== true || adapterLink?.resolved !== "vendor/archiver-compat") {
    problems.push("Lockfilen mangler node_modules/archiver-linket til kompatibilitetsadapteren.");
  }
  const adapterLock = lock.packages?.["vendor/archiver-compat"];
  if (adapterLock?.name !== "@kino-grenaa/archiver-compat" || adapterLock?.version !== "1.0.0") {
    problems.push("Lockfilen mangler kompatibilitetsadapterens package-metadata.");
  }

  const exactRuntime = {
    "archiver-modern": "8.0.0",
    "readdir-glob": "3.0.0",
    minimatch: "10.2.6",
    "brace-expansion": "5.0.9",
    unzipper: "0.12.3",
    uuid: "11.1.1",
  };
  for (const [name, expected] of Object.entries(exactRuntime)) {
    const entries = lockEntries(lock, name, true);
    if (entries.length === 0 || entries.some((entry) => entry.version !== expected)) {
      problems.push(`Runtime-lockfilen skal kun indeholde ${name}@${expected}; fundet: ${entries.map((entry) => entry.version).join(", ") || "ingen"}.`);
    }
  }

  for (const [name, expected] of Object.entries(expectedSecurityOverrides)) {
    const entries = lockEntries(lock, name, true);
    if (entries.length === 0 || entries.some((entry) => entry.version !== expected)) {
      problems.push(`Runtime-lockfilen skal kun indeholde ${name}@${expected}; fundet: ${entries.map((entry) => entry.version).join(", ") || "ingen"}.`);
    }
  }

  for (const item of findForbiddenRuntimePackages(lock)) {
    problems.push(`Usikker eller foraeldet runtime-afhaengighed: ${item}`);
  }

  const dockerfile = readFileSync(dockerfilePath, "utf8");
  for (const marker of [
    "FROM node:22-alpine AS base",
    "FROM base AS dependencies",
    "COPY vendor ./vendor",
    "RUN npm ci",
    "RUN npx prisma generate",
    "FROM dependencies AS build",
    "FROM base AS production-dependencies",
    "RUN npm ci --omit=dev --omit=peer --omit=optional",
    "COPY --from=dependencies /app/node_modules/.prisma ./node_modules/.prisma",
    "FROM base AS runtime",
    "COPY --from=production-dependencies /app/vendor ./vendor",
    "COPY --from=build /opt/backend-dist /opt/backend-dist",
  ]) {
    if (!dockerfile.includes(marker)) problems.push(`backend/Dockerfile mangler: ${marker}`);
  }
  if (/RUN\s+npm install\b/.test(dockerfile)) problems.push("backend/Dockerfile maa ikke bruge npm install.");
  if (/npm prune --omit=dev/.test(dockerfile)) problems.push("Produktionsafhaengigheder skal installeres rent med npm ci, ikke udledes med npm prune.");
  if (!dockerfile.includes("--omit=peer")) problems.push("Produktionsinstallationen skal udelade peer-only pakker.");
  if (!dockerfile.includes("--omit=optional")) problems.push("Produktionsinstallationen skal udelade devOptional-pakker som Prisma CLI og TypeScript.");

  const compose = readFileSync(composePath, "utf8");
  if (!/backend:\s[\s\S]*?target:\s*runtime/.test(compose)) problems.push("backend-service skal bygge runtime-target.");
  if (!/backend-build:\s[\s\S]*?target:\s*build/.test(compose)) problems.push("backend-build-service skal bygge build-target.");

  const moduleFiles = collectFiles(resolve(backendRoot, "src"), (path) => path.endsWith(".module.ts"));
  const providers = moduleFiles.filter((path) => /providers\s*:\s*\[[^\]]*\bPrismaService\b/s.test(readFileSync(path, "utf8")));
  if (providers.length !== 1 || !providers[0].replaceAll("\\", "/").endsWith("/prisma/prisma.module.ts")) {
    problems.push(`PrismaService skal registreres praecis én gang i prisma.module.ts; fundet: ${providers.map((path) => path.slice(backendRoot.length + 1)).join(", ") || "ingen"}.`);
  }

  const release = readFileSync(releasePath, "utf8");
  if (!release.includes('"audit:prod"') || !release.includes('"audit:report"')) {
    problems.push("Releaseflowet skal gate produktionaudit og rapportere samlet audit.");
  }
  if (!release.includes('"test:xlsx-hardening"')) {
    problems.push("Releaseflowet skal koere den samlede XLSX-hardening-test.");
  }
  if (release.includes('"audit:all"')) {
    problems.push("Releaseflowet maa ikke blokere paa dev-only auditfund; audit:all er en manuel kontrol.");
  }
  const workflow = readFileSync(workflowPath, "utf8");
  if (!workflow.includes("npm run audit:prod") || !workflow.includes("npm run audit:report")) {
    problems.push("GitHub Actions skal gate produktionaudit og rapportere samlet audit.");
  }
  if (!workflow.includes("npm run test:xlsx-hardening")) {
    problems.push("GitHub Actions skal koere den samlede XLSX-hardening-test.");
  }
  if (/run:\s+npm run audit:all/.test(workflow)) {
    problems.push("GitHub Actions maa ikke blokere paa dev-only auditfund.");
  }

  return problems;
}

export function assertBackendHardening(root = repoRoot) {
  const problems = collectBackendHardeningProblems(root);
  if (problems.length > 0) {
    throw new Error(`Backend-hardening fejlede:\n- ${problems.join("\n- ")}`);
  }
  return {
    nestVersion: expectedDirectVersions["@nestjs/core"],
    archiverAdapter: "@kino-grenaa/archiver-compat@1.0.0 -> native Node loader + ExcelJS pipe-return bridge -> archiver@8.0.0",
    prismaProvider: "backend/src/prisma/prisma.module.ts",
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = assertBackendHardening();
    console.log("Backend-hardening OK.");
    console.log(`NestJS: ${result.nestVersion}`);
    console.log(`Archiver: ${result.archiverAdapter}`);
    console.log(`Prisma-provider: ${result.prismaProvider}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
