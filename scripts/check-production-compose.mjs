import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");

function read(root, relativePath, problems) {
  const path = join(root, relativePath);
  if (!existsSync(path)) {
    problems.push(`Fil mangler: ${relativePath}`);
    return "";
  }
  return readFileSync(path, "utf8");
}

function requireText(content, marker, label, problems) {
  if (!content.includes(marker)) problems.push(`${label} mangler: ${marker}`);
}

export function collectProductionComposeProblems(root = repoRoot) {
  const problems = [];
  const compose = read(root, "docker-compose.production.yml", problems);
  const caddyfile = read(root, "deploy/Caddyfile", problems);
  const envExample = read(root, ".env.production.example", problems);
  const rehearsal = read(root, "scripts/rehearse-production-compose.mjs", problems);
  const docs = read(root, "docs/production-deployment.md", problems);
  const packageText = read(root, "package.json", problems);

  let packageJson = {};
  try {
    packageJson = JSON.parse(packageText);
  } catch {
    problems.push("package.json er ugyldigt JSON.");
  }

  const expectedScripts = {
    "check:production-compose": "node ./scripts/check-production-compose.mjs",
    "production:rehearse": "node ./scripts/rehearse-production-compose.mjs",
  };
  for (const [name, command] of Object.entries(expectedScripts)) {
    if (packageJson.scripts?.[name] !== command) {
      problems.push(`package.json mangler korrekt script: ${name}`);
    }
  }

  for (const service of ["database", "migrate", "backend", "frontend", "proxy"]) {
    requireText(compose, `  ${service}:`, "Production Compose", problems);
  }
  for (const marker of [
    "name: cinema-vagtplan-production",
    "image: postgres:16-alpine",
    'command: ["npx", "prisma", "migrate", "deploy"]',
    "condition: service_completed_successfully",
    "condition: service_healthy",
    "production_postgres_data:/var/lib/postgresql/data",
    "production_backend_runtime:/app/runtime-dist",
    "production_uploads:/app/uploads",
    "NEXT_PUBLIC_API_URL: ${APP_ORIGIN:?Set APP_ORIGIN in .env.production}",
    "FRONTEND_ORIGIN: ${APP_ORIGIN:?Set APP_ORIGIN in .env.production}",
    "REALTIME_CORS_ORIGIN: ${APP_ORIGIN:?Set APP_ORIGIN in .env.production}",
    "image: caddy:2.11.4-alpine",
    "./deploy/Caddyfile:/etc/caddy/Caddyfile:ro",
    "no-new-privileges:true",
    "max-size: \"10m\"",
  ]) {
    requireText(compose, marker, "Production Compose", problems);
  }

  const healthcheckCount = (compose.match(/\n\s+healthcheck:/g) ?? []).length;
  if (healthcheckCount < 4) {
    problems.push(`Production Compose skal have mindst fire healthchecks, men fandt ${healthcheckCount}.`);
  }
  if (compose.includes("container_name:")) {
    problems.push("Production Compose må ikke fastlåse container_name.");
  }
  for (const forbidden of [
    '"5432:5432"',
    '"3001:3001"',
    '"5555:5555"',
    '"3000:3000"',
    "./backend:/app",
    "./frontend:/app/frontend",
  ]) {
    if (compose.includes(forbidden)) {
      problems.push(`Production Compose indeholder forbudt udviklings-/portmarkør: ${forbidden}`);
    }
  }

  for (const marker of [
    "{$CADDY_SITE_ADDRESS}",
    "path /socket.io/*",
    "path /uploads/*",
    "method POST PUT PATCH DELETE OPTIONS",
    "header Authorization *",
    "header Content-Type application/json*",
    "reverse_proxy frontend:3000",
    "reverse_proxy @socket backend:3001",
  ]) {
    requireText(caddyfile, marker, "Caddyfile", problems);
  }

  for (const marker of [
    "APP_ORIGIN=https://",
    "CADDY_SITE_ADDRESS=https://",
    "POSTGRES_PASSWORD=replace-",
    "DATABASE_URL=postgresql://",
    "JWT_SECRET=replace-",
  ]) {
    requireText(envExample, marker, ".env.production.example", problems);
  }
  if (/JWT_SECRET=(?!replace-)[^\r\n]{20,}/.test(envExample)) {
    problems.push(".env.production.example ser ud til at indeholde en rigtig JWT-secret.");
  }

  for (const marker of [
    "docker-compose.production.yml",
    "production_uploads",
    "prisma migrate deploy",
    "Caddy",
    "COMPOSE_FILE",
    "backup:create",
    "rollback",
    "firewall",
  ]) {
    requireText(docs, marker, "Produktionsdokumentation", problems);
  }

  for (const marker of [
    "production-rehearsal-",
    '"down", "-v", "--remove-orphans"',
    "/socket.io/?EIO=4&transport=polling",
    "/app/uploads/.production-rehearsal-marker",
    'composeArgs("ps", "-q", service)',
    'HostConfig',
    'PortBindings',
    'assertNotPublished("database", "5432")',
    'assertNotPublished("backend", "3001")',
    'assertNotPublished("frontend", "3000")',
  ]) {
    requireText(rehearsal, marker, "Production rehearsal", problems);
  }

  if (rehearsal.includes('composeArgs("port"')) {
    problems.push(
      "Production rehearsal må ikke bruge `docker compose port` til upublicerede porte; nogle Compose-versioner returnerer `invalid IP:0`.",
    );
  }

  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = collectProductionComposeProblems();
  if (problems.length) {
    console.error("Production Compose-kontrollen fejlede:\n");
    for (const problem of problems) console.error(`- ${problem}`);
    process.exit(1);
  }
  console.log("Production Compose-kontrol OK.");
  console.log("Offentlig indgang: Caddy på HTTP/HTTPS");
  console.log("Interne services: PostgreSQL, migration, backend og frontend uden publicerede porte");
  console.log("Persistens: PostgreSQL, backend-runtime, uploads og Caddy-data");
}
