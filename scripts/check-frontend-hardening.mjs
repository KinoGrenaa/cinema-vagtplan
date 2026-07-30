import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const mojibakePattern = /(?:\u00c3[\u0080-\u00bf\u2026]|\u00c2[\u0080-\u00bf]|\u00e2(?:\u0080|\u20ac)|\ufffd)/u;

function findMojibakeFiles(frontendRoot) {
  const files = [];

  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && ["node_modules", ".next"].includes(entry.name)) {
        continue;
      }

      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }

      if (!/\.(?:ts|tsx|js|jsx|mjs|cjs|css)$/.test(entry.name)) {
        continue;
      }

      if (mojibakePattern.test(readFileSync(path, "utf8"))) {
        files.push(path.slice(frontendRoot.length + 1));
      }
    }
  }

  walk(frontendRoot);
  return files;
}

function serviceBlock(compose, service, nextService = null) {
  const startMarker = `\n  ${service}:`;
  const start = compose.indexOf(startMarker);
  if (start < 0) return "";
  const contentStart = start + 1;
  if (!nextService) return compose.slice(contentStart);
  const end = compose.indexOf(`\n  ${nextService}:`, contentStart);
  return end < 0 ? compose.slice(contentStart) : compose.slice(contentStart, end);
}

export function collectFrontendHardeningProblems(root = repoRoot) {
  const problems = [];
  const paths = {
    dockerignore: resolve(root, ".dockerignore"),
    dockerfile: resolve(root, "frontend", "Dockerfile"),
    nextConfig: resolve(root, "frontend", "next.config.ts"),
    frontendPackage: resolve(root, "frontend", "package.json"),
    frontendLock: resolve(root, "frontend", "package-lock.json"),
    startScript: resolve(root, "frontend", "scripts", "start-container.mjs"),
    auditScript: resolve(root, "frontend", "scripts", "report-frontend-audit.mjs"),
    compose: resolve(root, "docker-compose.yml"),
    rootPackage: resolve(root, "package.json"),
    release: resolve(root, "scripts", "run-release-checks.mjs"),
    workflow: resolve(root, ".github", "workflows", "release-checks.yml"),
  };

  for (const [name, path] of Object.entries(paths)) {
    if (!existsSync(path)) problems.push(`Mangler ${name}: ${path.slice(root.length + 1)}`);
  }
  if (problems.length > 0) return problems;

  const mojibakeFiles = findMojibakeFiles(resolve(root, "frontend"));
  if (mojibakeFiles.length > 0) {
    problems.push(
      `Frontend-kildekode indeholder fejlkonverteret UTF-8: ${mojibakeFiles.join(", ")}.`,
    );
  }

  const frontendPackage = readJson(paths.frontendPackage);
  const frontendLock = readJson(paths.frontendLock);
  const rootPackage = readJson(paths.rootPackage);

  const expectedRuntimeVersions = {
    next: "16.2.12",
    engineIoClient: "6.6.5",
    ws: "8.21.0",
    postcss: "8.5.25",
    sharp: "0.35.3",
  };
  if (frontendPackage.dependencies?.next !== expectedRuntimeVersions.next) {
    problems.push(`frontend/package.json skal bruge next ${expectedRuntimeVersions.next}.`);
  }
  if (frontendPackage.devDependencies?.["eslint-config-next"] !== expectedRuntimeVersions.next) {
    problems.push(`frontend/package.json skal bruge eslint-config-next ${expectedRuntimeVersions.next}.`);
  }
  if (frontendPackage.overrides?.["engine.io-client"] !== expectedRuntimeVersions.engineIoClient) {
    problems.push(`frontend/package.json skal fastlaase engine.io-client ${expectedRuntimeVersions.engineIoClient}.`);
  }
  if (frontendPackage.overrides?.ws !== expectedRuntimeVersions.ws) {
    problems.push(`frontend/package.json skal fastlaase ws ${expectedRuntimeVersions.ws}.`);
  }
  if (frontendPackage.overrides?.postcss !== expectedRuntimeVersions.postcss) {
    problems.push(`frontend/package.json skal fastlaase postcss ${expectedRuntimeVersions.postcss}.`);
  }
  if (frontendPackage.overrides?.sharp !== expectedRuntimeVersions.sharp) {
    problems.push(`frontend/package.json skal fastlaase sharp ${expectedRuntimeVersions.sharp}.`);
  }

  const lockRoot = frontendLock.packages?.[""] ?? {};
  if (lockRoot.dependencies?.next !== expectedRuntimeVersions.next) {
    problems.push(`frontend/package-lock.json skal fastlaase next ${expectedRuntimeVersions.next}.`);
  }
  if (lockRoot.devDependencies?.["eslint-config-next"] !== expectedRuntimeVersions.next) {
    problems.push(`frontend/package-lock.json skal fastlaase eslint-config-next ${expectedRuntimeVersions.next}.`);
  }
  function lockedVersions(packageName) {
    const suffix = `/node_modules/${packageName}`;
    return Object.entries(frontendLock.packages ?? {})
      .filter(([packagePath]) => packagePath === `node_modules/${packageName}` || packagePath.endsWith(suffix))
      .map(([, metadata]) => metadata?.version)
      .filter(Boolean);
  }

  for (const [packageName, expectedVersion] of [
    ["next", expectedRuntimeVersions.next],
    ["engine.io-client", expectedRuntimeVersions.engineIoClient],
    ["ws", expectedRuntimeVersions.ws],
    ["postcss", expectedRuntimeVersions.postcss],
    ["sharp", expectedRuntimeVersions.sharp],
  ]) {
    const versions = lockedVersions(packageName);
    if (versions.length === 0 || versions.some((version) => version !== expectedVersion)) {
      problems.push(
        `frontend/package-lock.json skal kun indeholde ${packageName} ${expectedVersion}, men fandt ${versions.join(", ") || "ingen version"}.`,
      );
    }
  }

  if (frontendLock.lockfileVersion !== 3) {
    problems.push(`frontend/package-lock.json skal bruge lockfileVersion 3, men bruger ${frontendLock.lockfileVersion}.`);
  }

  const expectedScripts = {
    "start:container": "node ./scripts/start-container.mjs",
    "audit:prod": "npm audit --omit=dev --audit-level=low",
    "audit:all": "npm audit --audit-level=high",
    "audit:report": "node ./scripts/report-frontend-audit.mjs",
    "check:hardening": "node ../scripts/check-frontend-hardening.mjs",
  };
  for (const [name, expected] of Object.entries(expectedScripts)) {
    if (frontendPackage.scripts?.[name] !== expected) {
      problems.push(`frontend/package.json script ${name} skal være: ${expected}`);
    }
  }
  const verifyRelease = frontendPackage.scripts?.["verify:release"] ?? "";
  for (const marker of ["check:hardening", "audit:prod", "audit:report", "test:dashboard", "build"]) {
    if (!verifyRelease.includes(marker)) problems.push(`Frontendens verify:release mangler ${marker}.`);
  }
  if (rootPackage.scripts?.["check:frontend-hardening"] !== "node ./scripts/check-frontend-hardening.mjs") {
    problems.push("Root package.json mangler check:frontend-hardening.");
  }

  const dockerfile = readFileSync(paths.dockerfile, "utf8");
  for (const marker of [
    "FROM node:22-alpine AS base",
    "FROM base AS dependencies",
    "COPY frontend/package.json frontend/package-lock.json ./",
    "RUN npm ci",
    "FROM dependencies AS build",
    "ARG NEXT_PUBLIC_API_URL=http://localhost:3001",
    "COPY frontend ./frontend",
    "COPY shared ./shared",
    "RUN npm run build",
    "FROM node:22-alpine AS runtime",
    "ENV NODE_ENV=production",
    "COPY --from=build --chown=nextjs:nodejs /app/frontend/.next/standalone ./",
    "COPY --from=build --chown=nextjs:nodejs /app/frontend/.next/static ./frontend/.next/static",
    "USER nextjs",
    "HEALTHCHECK",
    'CMD ["node", "frontend/scripts/start-container.mjs"]',
  ]) {
    if (!dockerfile.includes(marker)) problems.push(`frontend/Dockerfile mangler: ${marker}`);
  }
  if (/RUN\s+npm install\b/.test(dockerfile)) problems.push("frontend/Dockerfile maa ikke bruge npm install.");
  if (/CMD\s*\[\s*["']npm["']\s*,\s*["']run["']\s*,\s*["']dev["']/.test(dockerfile)) {
    problems.push("Frontendens runtime-image maa ikke starte Next.js development-serveren.");
  }
  if (/COPY\s+\.\s+\./.test(dockerfile)) {
    problems.push("Frontendens Dockerfile maa ikke kopiere hele repository-konteksten ukontrolleret.");
  }

  const nextConfig = readFileSync(paths.nextConfig, "utf8");
  for (const marker of [
    'output: "standalone"',
    'outputFileTracingRoot: path.resolve(__dirname, "..")',
    'root: path.resolve(__dirname, "..")',
  ]) {
    if (!nextConfig.includes(marker)) problems.push(`frontend/next.config.ts mangler: ${marker}`);
  }

  const dockerignore = readFileSync(paths.dockerignore, "utf8");
  for (const marker of [".git", "backend", "**/node_modules", "**/.next", "**/.env.*"]) {
    if (!dockerignore.split(/\r?\n/).includes(marker)) problems.push(`.dockerignore mangler: ${marker}`);
  }
  if (/^frontend\/?$/m.test(dockerignore) || /^shared\/?$/m.test(dockerignore)) {
    problems.push(".dockerignore maa ikke udelukke frontend eller shared fra build-konteksten.");
  }

  const compose = readFileSync(paths.compose, "utf8");
  const frontendService = serviceBlock(compose, "frontend", "frontend-build");
  const frontendBuildService = serviceBlock(compose, "frontend-build", null).split("\nvolumes:")[0];
  for (const marker of [
    "context: .",
    "dockerfile: ./frontend/Dockerfile",
    "target: runtime",
    "NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:3001}",
    "HOSTNAME: 0.0.0.0",
    "PORT: 3000",
  ]) {
    if (!frontendService.includes(marker)) problems.push(`frontend-service mangler: ${marker}`);
  }
  if (/\n\s+volumes:/.test(frontendService)) {
    problems.push("Frontendens runtime-service maa ikke bind-mounte kildekode eller node_modules.");
  }
  for (const marker of [
    "target: dependencies",
    "profiles:",
    "- tools",
    "working_dir: /app/frontend",
    "./frontend:/app/frontend",
    "./shared:/app/shared:ro",
    "/app/frontend/node_modules",
  ]) {
    if (!frontendBuildService.includes(marker)) problems.push(`frontend-build-service mangler: ${marker}`);
  }

  const startScript = readFileSync(paths.startScript, "utf8");
  for (const marker of [
    'resolve(root, "frontend", "server.js")',
    'resolve(root, "server.js")',
    "Next.js standalone-server mangler",
    "spawnProcess(process.execPath",
    'HOSTNAME: process.env.FRONTEND_HOSTNAME || "0.0.0.0"',
  ]) {
    if (!startScript.includes(marker)) problems.push(`Frontendens startscript mangler: ${marker}`);
  }

  const auditScript = readFileSync(paths.auditScript, "utf8");
  for (const marker of [
    'runAudit(["--omit=dev"])',
    "Frontendens produktionaudit har stadig",
    "Frontend auditrapport:",
  ]) {
    if (!auditScript.includes(marker)) problems.push(`Frontendens auditrapport mangler: ${marker}`);
  }

  const release = readFileSync(paths.release, "utf8");
  for (const marker of [
    '"check:frontend-hardening"',
    '"Frontend production audit"',
    '"frontend-build"',
    '"Frontend runtime-image er standalone, minimal og non-root"',
    '"Recreate frontend med nyt standalone runtime-image"',
  ]) {
    if (!release.includes(marker)) problems.push(`Releaseflowet mangler: ${marker}`);
  }
  if (/dockerStep\([^)]*"frontend"/.test(release)) {
    problems.push("Releaseflowet maa ikke koere tests eller build inde i frontendens minimale runtime-service.");
  }
  if (/\["compose",\s*"restart",\s*"frontend"\]/s.test(release)) {
    problems.push("Frontend skal recreates fra runtime-imaget og maa ikke blot genstartes efter kildekodeændringer.");
  }

  const workflow = readFileSync(paths.workflow, "utf8");
  for (const marker of [
    "npm run check:frontend-hardening",
    "npm run audit:prod",
    "npm run audit:report",
    "Build frontend standalone runtime image",
    "Verify minimal non-root frontend runtime image",
    "-f frontend/Dockerfile",
  ]) {
    if (!workflow.includes(marker)) problems.push(`GitHub Actions mangler: ${marker}`);
  }

  return problems;
}

export function assertFrontendHardening(root = repoRoot) {
  const problems = collectFrontendHardeningProblems(root);
  if (problems.length > 0) {
    throw new Error(`Frontend-hardening fejlede:\n- ${problems.join("\n- ")}`);
  }
  return {
    runtime: "Next.js standalone",
    user: "nextjs (uid 1001)",
    toolingService: "frontend-build",
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = assertFrontendHardening();
    console.log("Frontend-hardening OK.");
    console.log(`Runtime: ${result.runtime}`);
    console.log(`Bruger: ${result.user}`);
    console.log(`Værktøjsservice: ${result.toolingService}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
