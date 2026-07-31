import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const REQUIRED_PRODUCTION_ENV_KEYS = Object.freeze([
  "APP_ORIGIN",
  "CADDY_SITE_ADDRESS",
  "CADDY_ACME_EMAIL",
  "HTTP_BIND",
  "HTTPS_BIND",
  "HTTPS_UDP_BIND",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "POSTGRES_DB",
  "DATABASE_URL",
  "JWT_SECRET",
]);

const PLACEHOLDER_PATTERN = /(?:replace|change[-_ ]?me|changeme|example\.(?:com|dk|invalid)|<[^>]+>|your[-_ ]|password)/i;
const CONTROL_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

function decodeQuotedValue(raw, quote, lineNumber) {
  const closing = raw.lastIndexOf(quote);
  if (closing <= 0) {
    throw new Error(`Linje ${lineNumber}: citeret miljøværdi mangler afsluttende ${quote}.`);
  }
  const trailing = raw.slice(closing + 1).trim();
  if (trailing && !trailing.startsWith("#")) {
    throw new Error(`Linje ${lineNumber}: ugyldig tekst efter citeret miljøværdi.`);
  }
  const body = raw.slice(1, closing);
  if (quote === "'") return body;
  return body.replace(/\\([nrt\\"])/g, (_match, token) => {
    if (token === "n") return "\n";
    if (token === "r") return "\r";
    if (token === "t") return "\t";
    return token;
  });
}

export function parseEnvText(text) {
  const values = {};
  const lines = String(text).replace(/^\uFEFF/, "").split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const trimmed = lines[index].trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const normalized = trimmed.startsWith("export ") ? trimmed.slice(7).trimStart() : trimmed;
    const match = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      throw new Error(`Linje ${lineNumber}: forventede NAVN=værdi.`);
    }

    const [, key, rawValue] = match;
    if (Object.hasOwn(values, key)) {
      throw new Error(`Linje ${lineNumber}: miljøvariablen ${key} er angivet flere gange.`);
    }

    let value = rawValue.trim();
    if (value.startsWith('"') || value.startsWith("'")) {
      value = decodeQuotedValue(value, value[0], lineNumber);
    } else {
      const commentIndex = value.search(/\s+#/);
      if (commentIndex >= 0) value = value.slice(0, commentIndex).trimEnd();
    }

    if (CONTROL_PATTERN.test(value)) {
      throw new Error(`Linje ${lineNumber}: ${key} indeholder kontroltegn.`);
    }
    values[key] = value;
  }

  return values;
}

export function readProductionEnvFile(envPath) {
  const absolutePath = resolve(envPath);
  return {
    absolutePath,
    values: parseEnvText(readFileSync(absolutePath, "utf8")),
  };
}

function addProblem(problems, message) {
  if (!problems.includes(message)) problems.push(message);
}

function looksLikePlaceholder(value) {
  return !value || PLACEHOLDER_PATTERN.test(value);
}

function parseOrigin(value, key, problems, { allowHttp }) {
  let url;
  try {
    url = new URL(value);
  } catch {
    addProblem(problems, `${key} skal være en gyldig absolut URL.`);
    return null;
  }
  if (url.protocol !== "https:" && !(allowHttp && url.protocol === "http:")) {
    addProblem(problems, `${key} skal bruge HTTPS.`);
  }
  if (url.username || url.password) addProblem(problems, `${key} må ikke indeholde loginoplysninger.`);
  if (url.pathname !== "/" || url.search || url.hash) {
    addProblem(problems, `${key} må kun indeholde origin uden sti, query eller fragment.`);
  }
  return url;
}

function parseBind(value, key, expectedPort, problems) {
  const match = String(value).match(/^(?:\[[0-9a-fA-F:]+\]|[^:\s]+):(\d{1,5})$/);
  if (!match) {
    addProblem(problems, `${key} skal have formen IP:port eller [IPv6]:port.`);
    return;
  }
  const port = Number(match[1]);
  if (port !== expectedPort) addProblem(problems, `${key} skal bruge port ${expectedPort}.`);
}

function safelyDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function collectProductionEnvProblems(values, options = {}) {
  const allowHttp = options.allowHttp === true;
  const problems = [];

  for (const key of REQUIRED_PRODUCTION_ENV_KEYS) {
    if (!Object.hasOwn(values, key) || values[key] === "") {
      addProblem(problems, `Miljøvariablen ${key} mangler.`);
    }
  }
  if (problems.length > 0) return problems;

  const appOrigin = parseOrigin(values.APP_ORIGIN, "APP_ORIGIN", problems, { allowHttp });
  let caddyOrigin = null;
  if (allowHttp && /^:\d+$/.test(values.CADDY_SITE_ADDRESS)) {
    if (values.CADDY_SITE_ADDRESS !== ":80") {
      addProblem(problems, "CADDY_SITE_ADDRESS må kun være :80 ved lokal HTTP-kontrol.");
    }
  } else {
    caddyOrigin = parseOrigin(values.CADDY_SITE_ADDRESS, "CADDY_SITE_ADDRESS", problems, { allowHttp });
  }
  if (appOrigin && caddyOrigin && appOrigin.origin !== caddyOrigin.origin) {
    addProblem(problems, "APP_ORIGIN og CADDY_SITE_ADDRESS skal være samme origin.");
  }
  if (!allowHttp && (looksLikePlaceholder(values.APP_ORIGIN) || looksLikePlaceholder(values.CADDY_SITE_ADDRESS))) {
    addProblem(problems, "Produktionsorigin indeholder en eksempel- eller placeholderværdi.");
  }

  const email = values.CADDY_ACME_EMAIL;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    addProblem(problems, "CADDY_ACME_EMAIL skal være en gyldig mailadresse.");
  } else if (!allowHttp && looksLikePlaceholder(email)) {
    addProblem(problems, "CADDY_ACME_EMAIL indeholder en eksempel- eller placeholderværdi.");
  }

  parseBind(values.HTTP_BIND, "HTTP_BIND", 80, problems);
  parseBind(values.HTTPS_BIND, "HTTPS_BIND", 443, problems);
  parseBind(values.HTTPS_UDP_BIND, "HTTPS_UDP_BIND", 443, problems);

  for (const key of ["POSTGRES_USER", "POSTGRES_DB"]) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(values[key])) {
      addProblem(problems, `${key} må kun indeholde bogstaver, tal og underscore og må ikke starte med et tal.`);
    }
  }

  const postgresPassword = values.POSTGRES_PASSWORD;
  if (postgresPassword.length < 32) addProblem(problems, "POSTGRES_PASSWORD skal være mindst 32 tegn.");
  if (/\s/.test(postgresPassword)) addProblem(problems, "POSTGRES_PASSWORD må ikke indeholde whitespace.");
  if (looksLikePlaceholder(postgresPassword)) addProblem(problems, "POSTGRES_PASSWORD er stadig en placeholder eller et svagt eksempel.");

  let databaseUrl;
  try {
    databaseUrl = new URL(values.DATABASE_URL);
  } catch {
    addProblem(problems, "DATABASE_URL er ikke en gyldig PostgreSQL-URL.");
  }
  if (databaseUrl) {
    if (!["postgresql:", "postgres:"].includes(databaseUrl.protocol)) {
      addProblem(problems, "DATABASE_URL skal bruge postgresql:// eller postgres://.");
    }
    if (databaseUrl.hostname !== "database") addProblem(problems, "DATABASE_URL skal bruge Compose-hostnavnet database.");
    if (databaseUrl.port && databaseUrl.port !== "5432") addProblem(problems, "DATABASE_URL skal bruge intern PostgreSQL-port 5432.");
    if (safelyDecode(databaseUrl.username) !== values.POSTGRES_USER) {
      addProblem(problems, "DATABASE_URL-brugeren matcher ikke POSTGRES_USER.");
    }
    if (safelyDecode(databaseUrl.password) !== postgresPassword) {
      addProblem(problems, "DATABASE_URL-adgangskoden matcher ikke POSTGRES_PASSWORD.");
    }
    if (safelyDecode(databaseUrl.pathname.replace(/^\//, "")) !== values.POSTGRES_DB) {
      addProblem(problems, "DATABASE_URL-databasen matcher ikke POSTGRES_DB.");
    }
    if (databaseUrl.searchParams.get("schema") !== "public") {
      addProblem(problems, "DATABASE_URL skal angive schema=public.");
    }
  }

  const jwtSecret = values.JWT_SECRET;
  if (jwtSecret.length < 64) addProblem(problems, "JWT_SECRET skal være mindst 64 tegn.");
  if (jwtSecret.length > 512) addProblem(problems, "JWT_SECRET er urimeligt lang; brug højst 512 tegn.");
  if (!/^[A-Za-z0-9_-]+$/.test(jwtSecret)) {
    addProblem(problems, "JWT_SECRET må kun bruge bogstaver, tal, underscore og bindestreg.");
  }
  if (new Set(jwtSecret).size < 12 || looksLikePlaceholder(jwtSecret)) {
    addProblem(problems, "JWT_SECRET ligner ikke en tilfældig produktionssecret.");
  }

  const vapidKeys = ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"];
  const configuredVapid = vapidKeys.filter((key) => Boolean(values[key]));
  if (configuredVapid.length > 0 && configuredVapid.length !== vapidKeys.length) {
    addProblem(problems, "VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY og VAPID_SUBJECT skal angives samlet.");
  }
  if (configuredVapid.length === vapidKeys.length) {
    if (values.VAPID_PUBLIC_KEY.length < 40 || values.VAPID_PRIVATE_KEY.length < 40) {
      addProblem(problems, "VAPID-nøglerne er for korte.");
    }
    if (!/^(?:mailto:|https:\/\/)/.test(values.VAPID_SUBJECT)) {
      addProblem(problems, "VAPID_SUBJECT skal starte med mailto: eller https://.");
    }
  }

  return problems;
}

export function summarizeProductionEnv(values) {
  return {
    appOrigin: values.APP_ORIGIN,
    caddySiteAddress: values.CADDY_SITE_ADDRESS,
    postgresUser: values.POSTGRES_USER,
    postgresDatabase: values.POSTGRES_DB,
    postgresPasswordLength: values.POSTGRES_PASSWORD?.length ?? 0,
    jwtSecretLength: values.JWT_SECRET?.length ?? 0,
    vapidConfigured: Boolean(values.VAPID_PUBLIC_KEY && values.VAPID_PRIVATE_KEY && values.VAPID_SUBJECT),
  };
}
