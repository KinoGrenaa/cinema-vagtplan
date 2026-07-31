import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const PLAYWRIGHT_VERSION = "1.62.0";
const EXPECTED_FLOW_TESTS = 11;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function serviceBlock(compose, service, nextService = null) {
  const startMarker = `\n  ${service}:`;
  const start = compose.indexOf(startMarker);
  if (start < 0) return "";
  const contentStart = start + 1;
  if (!nextService) return compose.slice(contentStart).split("\nvolumes:")[0];
  const end = compose.indexOf(`\n  ${nextService}:`, contentStart);
  return end < 0 ? compose.slice(contentStart) : compose.slice(contentStart, end);
}

export function collectFrontendFlowProblems(root = repoRoot) {
  const problems = [];
  const paths = {
    frontendPackage: resolve(root, "frontend", "package.json"),
    frontendLock: resolve(root, "frontend", "package-lock.json"),
    dockerfile: resolve(root, "frontend", "Dockerfile"),
    compose: resolve(root, "docker-compose.yml"),
    config: resolve(root, "frontend", "playwright.config.ts"),
    spec: resolve(root, "frontend", "tests", "flows", "critical-flows.spec.ts"),
    loginPage: resolve(root, "frontend", "app", "page.tsx"),
    modulesProvider: resolve(root, "frontend", "app", "providers", "CinemaModulesProvider.tsx"),
    payrollPageHook: resolve(
      root,
      "frontend",
      "app",
      "(app)",
      "payroll",
      "hooks",
      "usePayrollPage.ts",
    ),
    containerRunner: resolve(root, "frontend", "scripts", "run-flow-tests-container.mjs"),
    hostRunner: resolve(root, "frontend", "scripts", "run-flow-tests-host.mjs"),
    rootPackage: resolve(root, "package.json"),
    release: resolve(root, "scripts", "run-release-checks.mjs"),
    workflow: resolve(root, ".github", "workflows", "release-checks.yml"),
    gitignore: resolve(root, ".gitignore"),
  };

  for (const [name, path] of Object.entries(paths)) {
    if (!existsSync(path)) {
      problems.push(`Mangler ${name}: ${path.slice(root.length + 1)}`);
    }
  }
  if (problems.length > 0) return problems;

  const frontendPackage = readJson(paths.frontendPackage);
  const frontendLock = readJson(paths.frontendLock);
  const rootPackage = readJson(paths.rootPackage);
  if (frontendPackage.devDependencies?.["@playwright/test"] !== PLAYWRIGHT_VERSION) {
    problems.push(`frontend/package.json skal fastlaase @playwright/test ${PLAYWRIGHT_VERSION}.`);
  }
  if (
    frontendPackage.scripts?.["test:flows"] !==
    "playwright test --config=./playwright.config.ts"
  ) {
    problems.push("frontend/package.json mangler det reproducerbare test:flows-script.");
  }
  if (
    frontendPackage.scripts?.["test:flows:host"] !==
    "node ./scripts/run-flow-tests-host.mjs"
  ) {
    problems.push("frontend/package.json mangler test:flows:host-scriptet.");
  }
  const lockRoot = frontendLock.packages?.[""] ?? {};
  if (lockRoot.devDependencies?.["@playwright/test"] !== PLAYWRIGHT_VERSION) {
    problems.push(`frontend/package-lock.json skal fastlaase @playwright/test ${PLAYWRIGHT_VERSION}.`);
  }
  const lockedPlaywright = frontendLock.packages?.["node_modules/@playwright/test"]?.version;
  if (lockedPlaywright !== PLAYWRIGHT_VERSION) {
    problems.push(
      `frontend/package-lock.json skal indeholde @playwright/test ${PLAYWRIGHT_VERSION}, men fandt ${lockedPlaywright ?? "ingen version"}.`,
    );
  }

  const config = readFileSync(paths.config, "utf8");
  for (const marker of [
    'testDir: "./tests/flows"',
    "workers: 1",
    'timezoneId: "Europe/Copenhagen"',
    'trace: "retain-on-failure"',
    'screenshot: "only-on-failure"',
    'serviceWorkers: "block"',
  ]) {
    if (!config.includes(marker)) problems.push(`Playwright-konfigurationen mangler: ${marker}`);
  }

  const spec = readFileSync(paths.spec, "utf8");
  const testCount = (spec.match(/\btest\("/g) ?? []).length;
  if (testCount !== EXPECTED_FLOW_TESTS) {
    problems.push(
      `Den kritiske flow-suite skal indeholde ${EXPECTED_FLOW_TESTS} tests, men indeholder ${testCount}.`,
    );
  }
  for (const marker of [
    "forkert login viser dansk og handlingsklar fejl",
    "ADMIN logger ind på én biograf",
    "medarbejder med flere biografer sendes til biografvalg",
    "MASTER-login med standardbiograf",
    "medarbejdermenu skjuler administrative områder",
    "deaktiveret lønmodul skjules i menuen",
    "401 fra apiFetch rydder sessionen",
  ]) {
    if (!spec.includes(marker)) problems.push(`Flow-suiten mangler scenariet: ${marker}`);
  }
  if (!spec.includes("X-Cinema-Id") && !spec.includes("x-cinema-id")) {
    problems.push("Flow-suiten mangler kontrol af MASTER-biografheaderen.");
  }
  for (const marker of [
    "page.addInitScript(",
    'sessionStorage.getItem(seedKey)',
    'pathname === "/auth/default-cinema-options"',
    "waitForPath(page",
    "waitForModules(calls)",
    'input[type="email"]',
    'input[type="password"]',
    "const payrollCalls = calls.filter",
  ]) {
    if (!spec.includes(marker)) {
      problems.push(`Flow-suiten mangler stabil browseropsætning: ${marker}`);
    }
  }

  const modulesProvider = readFileSync(paths.modulesProvider, "utf8");
  for (const marker of [
    "resolvedContextKey",
    "activeContextKey",
    "moduleRequestIdRef",
    "resolvedContextKey !== activeContextKey",
    "setResolvedContextKey(null)",
    "moduleRequestIdRef.current !==",
  ]) {
    if (!modulesProvider.includes(marker)) {
      problems.push(`Modulprovideren mangler kontekst-synkronisering: ${marker}`);
    }
  }
  if (modulesProvider.includes("const [loading, setLoading]")) {
    problems.push(
      "Modulprovideren maa ikke markere adgang som indlaest for en tidligere auth-kontekst.",
    );
  }

  const payrollPageHook = readFileSync(paths.payrollPageHook, "utf8");
  for (const marker of [
    'useCinemaModules',
    'loading: modulesLoading',
    '!modulesLoading',
    'hasCinemaContext',
    'isModuleEnabled("PAYROLL")',
    'enabled: payrollDataEnabled',
  ]) {
    if (!payrollPageHook.includes(marker)) {
      problems.push(`Lønsiden mangler modulstyret dataadgang: ${marker}`);
    }
  }

  const loginPage = readFileSync(paths.loginPage, "utf8");
  if (loginPage.includes("await routeAuthenticatedUser(data.user.role);")) {
    problems.push(
      "Loginflowet maa ikke starte en ekstra navigation direkte efter login; AuthProvider-effekten skal route én gang.",
    );
  }

  const dockerfile = readFileSync(paths.dockerfile, "utf8");
  for (const marker of [
    `FROM mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble AS flow-tests`,
    "COPY frontend/playwright.config.ts ./playwright.config.ts",
    "COPY frontend/tests/flows ./tests/flows",
    "COPY --from=build /app/frontend/.next/standalone ./",
    'CMD ["node", "./scripts/run-flow-tests-container.mjs"]',
  ]) {
    if (!dockerfile.includes(marker)) problems.push(`Frontendens flow-testtarget mangler: ${marker}`);
  }

  const compose = readFileSync(paths.compose, "utf8");
  const flowService = serviceBlock(compose, "frontend-flow-tests");
  for (const marker of [
    "target: flow-tests",
    "NEXT_PUBLIC_API_URL: http://localhost:3001",
    "profiles:",
    "- tools",
    "init: true",
    "ipc: host",
    "./frontend/test-results:/tests/test-results",
  ]) {
    if (!flowService.includes(marker)) problems.push(`frontend-flow-tests-service mangler: ${marker}`);
  }
  for (const forbiddenMount of [
    "./frontend:/tests",
    "./frontend:/app/frontend",
    "./shared:/app/shared",
  ]) {
    if (flowService.includes(forbiddenMount)) {
      problems.push(
        `Frontendens flow-testservice maa ikke bind-mounte kildekode: ${forbiddenMount}`,
      );
    }
  }

  const containerRunner = readFileSync(paths.containerRunner, "utf8");
  for (const marker of [
    'resolve(appRoot, "frontend", "server.js")',
    'fetch("http://127.0.0.1:3000/")',
    '"@playwright"',
    'FRONTEND_FLOW_BASE_URL: "http://127.0.0.1:3000"',
    'rmSync(resolve(testRoot, "test-results", "flows")',
    'server.kill("SIGTERM")',
  ]) {
    if (!containerRunner.includes(marker)) problems.push(`Container-runneren mangler: ${marker}`);
  }

  const hostRunner = readFileSync(paths.hostRunner, "utf8");
  for (const marker of [
    'process.platform === "win32" ? "npm.cmd" : "npm"',
    'FLOW_TEST_BROWSER_CHANNEL',
    '["run", "test:flows"]',
    'server.kill("SIGTERM")',
  ]) {
    if (!hostRunner.includes(marker)) problems.push(`Host-runneren mangler: ${marker}`);
  }

  if (
    rootPackage.scripts?.["check:frontend-flows"] !==
    "node ./scripts/check-frontend-flows.mjs"
  ) {
    problems.push("Root package.json mangler check:frontend-flows.");
  }
  if (
    rootPackage.scripts?.["test:frontend-flows"] !==
    "docker compose run --rm --no-deps -T --build frontend-flow-tests"
  ) {
    problems.push("Root package.json mangler test:frontend-flows.");
  }

  const release = readFileSync(paths.release, "utf8");
  for (const marker of [
    '"check:frontend-flows"',
    '"Kritiske frontend-flowtests"',
    '"frontend-flow-tests"',
    '"test:flows:host"',
  ]) {
    if (!release.includes(marker)) problems.push(`Releaseflowet mangler: ${marker}`);
  }

  const workflow = readFileSync(paths.workflow, "utf8");
  for (const marker of [
    "name: Critical frontend flows",
    "cinema-vagtplan-frontend-flow-tests:ci",
  ]) {
    if (!workflow.includes(marker)) problems.push(`GitHub Actions mangler: ${marker}`);
  }
  if (
    !workflow.includes("--target flow-tests") &&
    !workflow.includes("target: flow-tests")
  ) {
    problems.push(
      "GitHub Actions mangler flow-testtarget: --target flow-tests eller target: flow-tests",
    );
  }

  const gitignore = readFileSync(paths.gitignore, "utf8");
  for (const marker of ["frontend/test-results", "frontend/playwright-report"]) {
    if (!gitignore.split(/\r?\n/).includes(marker)) {
      problems.push(`.gitignore mangler: ${marker}`);
    }
  }

  return problems;
}

export function assertFrontendFlows(root = repoRoot) {
  const problems = collectFrontendFlowProblems(root);
  if (problems.length > 0) {
    throw new Error(`Frontend-flowtestkontrol fejlede:\n- ${problems.join("\n- ")}`);
  }
  return {
    framework: `Playwright ${PLAYWRIGHT_VERSION}`,
    tests: EXPECTED_FLOW_TESTS,
    runtime: "Next.js standalone",
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = assertFrontendFlows();
    console.log("Frontend-flowtestkontrol OK.");
    console.log(`Framework: ${result.framework}`);
    console.log(`Kritiske flows: ${result.tests}`);
    console.log(`Test-runtime: ${result.runtime}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
