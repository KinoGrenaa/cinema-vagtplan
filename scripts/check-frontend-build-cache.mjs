import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const defaultRepoRoot = resolve(import.meta.dirname, "..");

function read(root, relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

function count(source, value) {
  return source.split(value).length - 1;
}

export function collectFrontendBuildCacheProblems(root = defaultRepoRoot) {
  const problems = [];
  const dockerfile = read(root, "frontend/Dockerfile");
  const workflow = read(root, ".github/workflows/release-checks.yml");
  const packageJson = JSON.parse(read(root, "package.json"));
  const documentation = read(root, "docs/frontend-build-cache.md");

  if (!dockerfile.startsWith("# syntax=docker/dockerfile:1\n")) {
    problems.push("frontend/Dockerfile skal aktivere den stabile Dockerfile-syntaks til cache mounts.");
  }

  const npmCacheMount =
    "--mount=type=cache,id=cinema-frontend-npm,target=/root/.npm,sharing=locked";
  if (count(dockerfile, npmCacheMount) < 2) {
    problems.push("Både frontend-dependencies og Playwright-stage skal genbruge den låste npm-cache.");
  }

  const nextCacheMount =
    "--mount=type=cache,id=cinema-next-build,target=/app/frontend/.next/cache,sharing=locked";
  if (!dockerfile.includes(nextCacheMount)) {
    problems.push("Next.js-buildet skal genbruge /app/frontend/.next/cache gennem BuildKit.");
  }

  if (/COPY[^\n]*\.next\/cache/.test(dockerfile)) {
    problems.push("Next.js build-cache må ikke kopieres ind i runtime-imaget.");
  }

  if (!workflow.includes("uses: actions/cache@v4")) {
    problems.push("GitHub Actions skal bevare frontend/.next/cache til det almindelige Next.js-build.");
  }
  if (!workflow.includes("path: frontend/.next/cache")) {
    problems.push("GitHub Actions-cache skal pege på frontend/.next/cache.");
  }
  if (count(workflow, "uses: docker/setup-buildx-action@v3") < 2) {
    problems.push("Både frontend-runtime og flowtestjobbet skal bruge den officielle Buildx-builder.");
  }
  if (count(workflow, "uses: docker/build-push-action@v6") < 2) {
    problems.push("Både frontend-runtime og flowtestjobbet skal bygges med den officielle Buildx-action.");
  }

  for (const scope of ["frontend-runtime", "frontend-flow-tests"]) {
    if (!workflow.includes(`cache-from: type=gha,scope=${scope}`)) {
      problems.push(`GitHub Actions mangler cache-from for ${scope}.`);
    }
    if (!workflow.includes(`cache-to: type=gha,mode=max,scope=${scope}`)) {
      problems.push(`GitHub Actions mangler cache-to mode=max for ${scope}.`);
    }
  }

  if (!workflow.includes("load: true")) {
    problems.push("De cachede CI-images skal fortsat indlæses lokalt til runtime-verifikation.");
  }

  if (
    packageJson.scripts?.["check:frontend-build-cache"] !==
    "node ./scripts/check-frontend-build-cache.mjs"
  ) {
    problems.push("Root package.json mangler check:frontend-build-cache.");
  }

  if (!/cache mounts ikke eksporteres/i.test(documentation)) {
    problems.push("Dokumentationen skal beskrive begrænsningen for BuildKit cache mounts i GitHub Actions.");
  }

  return problems;
}

function run() {
  const problems = collectFrontendBuildCacheProblems();
  if (problems.length > 0) {
    console.error("Frontend build-cachekontrol fejlede:");
    for (const problem of problems) console.error(`- ${problem}`);
    process.exit(1);
  }

  console.log("Frontend build-cachekontrol OK.");
  console.log("Lokal Docker-cache: npm + Next.js .next/cache");
  console.log("GitHub Actions: Next.js host-cache + scoped Buildx layer-cache");
  console.log("Runtime-image: uændret og uden build-cache");
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  run();
}
