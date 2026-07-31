import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  collectProductionEnvProblems,
  parseEnvText,
} from "./production-env-lib.mjs";
import {
  buildCaddyValidateArgs,
  buildProductionComposeArgs,
  parseProductionPreflightArgs,
} from "./production-preflight.mjs";

const repoRoot = resolve(import.meta.dirname, "..");

function validValues(overrides = {}) {
  const password = "a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0";
  return {
    APP_ORIGIN: "https://vagtplan.kinogrenaa.dk",
    CADDY_SITE_ADDRESS: "https://vagtplan.kinogrenaa.dk",
    CADDY_ACME_EMAIL: "drift@kinogrenaa.dk",
    HTTP_BIND: "0.0.0.0:80",
    HTTPS_BIND: "0.0.0.0:443",
    HTTPS_UDP_BIND: "0.0.0.0:443",
    POSTGRES_USER: "cinema",
    POSTGRES_PASSWORD: password,
    POSTGRES_DB: "cinema_vagtplan",
    DATABASE_URL: `postgresql://cinema:${password}@database:5432/cinema_vagtplan?schema=public`,
    JWT_SECRET: "0123456789abcdef".repeat(6),
    ...overrides,
  };
}

test("gyldig produktionskonfiguration accepteres uden at afsløre secrets", () => {
  assert.deepEqual(collectProductionEnvProblems(validValues()), []);
});

test("placeholders og svage secrets afvises", () => {
  const problems = collectProductionEnvProblems(validValues({
    APP_ORIGIN: "https://vagtplan.example.dk",
    CADDY_SITE_ADDRESS: "https://vagtplan.example.dk",
    POSTGRES_PASSWORD: "password",
    DATABASE_URL: "postgresql://cinema:password@database:5432/cinema_vagtplan?schema=public",
    JWT_SECRET: "replace-me",
  }));
  assert.ok(problems.some((problem) => problem.includes("placeholder")));
  assert.ok(problems.some((problem) => problem.includes("POSTGRES_PASSWORD")));
  assert.ok(problems.some((problem) => problem.includes("JWT_SECRET")));
});

test("database-URL skal matche bruger, adgangskode, database og schema", () => {
  const problems = collectProductionEnvProblems(validValues({
    DATABASE_URL: "postgresql://other:wrong@localhost:5433/other?schema=test",
  }));
  for (const fragment of ["Compose-hostnavnet database", "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB", "schema=public"]) {
    assert.ok(problems.some((problem) => problem.includes(fragment)), fragment);
  }
});

test("HTTPS og samme offentlige origin kræves i produktion", () => {
  const problems = collectProductionEnvProblems(validValues({
    APP_ORIGIN: "http://vagtplan.kinogrenaa.dk",
    CADDY_SITE_ADDRESS: "https://anden.kinogrenaa.dk",
  }));
  assert.ok(problems.some((problem) => problem.includes("HTTPS")));
  assert.ok(problems.some((problem) => problem.includes("samme origin")));
});

test("lokal HTTP-kontrol accepterer :80 uden at lempe secretkrav", () => {
  const values = validValues({
    APP_ORIGIN: "http://127.0.0.1:18080",
    CADDY_SITE_ADDRESS: ":80",
    CADDY_ACME_EMAIL: "rehearsal@example.invalid",
    HTTP_BIND: "127.0.0.1:80",
    HTTPS_BIND: "127.0.0.1:443",
    HTTPS_UDP_BIND: "127.0.0.1:443",
  });
  assert.deepEqual(collectProductionEnvProblems(values, { allowHttp: true }), []);
});

test("VAPID-konfiguration skal være komplet", () => {
  const problems = collectProductionEnvProblems(validValues({ VAPID_PUBLIC_KEY: "x".repeat(64) }));
  assert.ok(problems.some((problem) => problem.includes("skal angives samlet")));
});

test("env-parseren afviser dubletter og håndterer citater", () => {
  assert.deepEqual(parseEnvText("A='en værdi'\nB=to # kommentar\n"), { A: "en værdi", B: "to" });
  assert.throws(() => parseEnvText("A=1\nA=2\n"), /angivet flere gange/);
});

test("preflight-argumenter og Docker-kommandoer er sikre", () => {
  const options = parseProductionPreflightArgs([
    "--env-file",
    "backups/test/.env.production",
    "--allow-http",
    "--allow-dirty",
  ]);
  assert.equal(options.allowHttp, true);
  assert.equal(options.allowDirty, true);
  assert.ok(buildProductionComposeArgs(options.envFile, "config", "--quiet").includes("--env-file"));
  const caddyArgs = buildCaddyValidateArgs(validValues());
  assert.deepEqual(caddyArgs.slice(0, 2), ["run", "--rm"]);
  assert.ok(caddyArgs.includes("caddy:2.11.4-alpine"));
  assert.ok(!caddyArgs.join(" ").includes(validValues().POSTGRES_PASSWORD));
});

test("repositoryet indeholder scripts, dokumentation og package-kommandoer", () => {
  const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  assert.equal(packageJson.scripts["check:production-env"], "node ./scripts/check-production-env.mjs");
  assert.equal(packageJson.scripts["production:preflight"], "node ./scripts/production-preflight.mjs");
  const docs = readFileSync(join(repoRoot, "docs", "production-preflight.md"), "utf8");
  for (const marker of ["production:preflight", "check:production-env", "chmod 600", "JWT_SECRET", "POSTGRES_PASSWORD"]) {
    assert.ok(docs.includes(marker), marker);
  }
});

test("CLI-fejlmeddelelser gengiver ikke secretværdier", () => {
  const directory = mkdtempSync(join(tmpdir(), "cinema-production-env-"));
  const secret = "super-hemmelig-værdi-som-ikke-maa-logges";
  const envPath = join(directory, ".env.production");
  writeFileSync(envPath, `POSTGRES_PASSWORD=${secret}\nJWT_SECRET=${secret}\n`, "utf8");
  try {
    const result = spawnSync(process.execPath, [
      join(repoRoot, "scripts", "check-production-env.mjs"),
      "--env-file",
      envPath,
      "--skip-git-safety",
    ], { cwd: repoRoot, encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.equal(`${result.stdout}${result.stderr}`.includes(secret), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
