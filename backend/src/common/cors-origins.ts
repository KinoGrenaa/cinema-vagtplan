const DEFAULT_CORS_ORIGIN = 'http://localhost:3000';

const DEFAULT_CORS_ENVIRONMENT_KEYS = [
  'BACKEND_CORS_ORIGIN',
  'CORS_ORIGIN',
  'FRONTEND_ORIGIN',
] as const;

function normalizeCorsOrigin(value: string) {
  const origin = value.trim();

  if (!origin || origin === '*') {
    throw new Error(
      'CORS-origin skal være en konkret HTTP- eller HTTPS-origin',
    );
  }

  let parsed: URL;

  try {
    parsed = new URL(origin);
  } catch {
    throw new Error(`Ugyldig CORS-origin: ${origin}`);
  }

  if (
    (parsed.protocol !== 'http:' &&
      parsed.protocol !== 'https:') ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(`Ugyldig CORS-origin: ${origin}`);
  }

  return parsed.origin;
}

function getConfiguredOrigins(
  environment: NodeJS.ProcessEnv,
  environmentKeys: readonly string[],
) {
  for (const key of environmentKeys) {
    if (
      Object.prototype.hasOwnProperty.call(
        environment,
        key,
      )
    ) {
      return environment[key] ?? '';
    }
  }

  return DEFAULT_CORS_ORIGIN;
}

export function getAllowedCorsOrigins(
  environment: NodeJS.ProcessEnv = process.env,
  environmentKeys: readonly string[] =
    DEFAULT_CORS_ENVIRONMENT_KEYS,
) {
  const configuredOrigins = getConfiguredOrigins(
    environment,
    environmentKeys,
  );

  const origins = configuredOrigins
    .split(',')
    .map((origin) => normalizeCorsOrigin(origin));

  return [...new Set(origins)];
}
