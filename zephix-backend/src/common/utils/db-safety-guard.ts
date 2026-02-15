/**
 * DB Safety Guard — prevents environment↔database cross-wiring.
 *
 * Railway uses environment-scoped internal DNS:
 *   `postgres.railway.internal` resolves to the correct Postgres
 *   instance for whichever Railway environment the container runs in.
 *   This means the internal hostname is the SAME across environments.
 *
 * Public proxy hostnames ARE unique per database instance:
 *   Production: ballast.proxy.rlwy.net
 *   Staging:    interchange.proxy.rlwy.net (shortline.proxy.rlwy.net also valid)
 *   Test:       yamabiko.proxy.rlwy.net
 *
 * Guard strategy:
 *   1. Internal hostnames (*.railway.internal) are allowed for all ZEPHIX_ENV
 *      values because Railway's DNS scoping handles isolation.
 *   2. Public proxy hostnames are blocked if they belong to a different environment.
 *   3. ZEPHIX_ENV must be set for Railway deployments (catches misconfiguration).
 */

/** Known public proxy hostnames per environment */
export const PRODUCTION_PROXY_HOSTS = ['ballast.proxy.rlwy.net'];
export const STAGING_PROXY_HOSTS = [
  'interchange.proxy.rlwy.net',
  'shortline.proxy.rlwy.net',
];
export const TEST_PROXY_HOSTS = ['yamabiko.proxy.rlwy.net'];

export function extractDbHost(databaseUrl: string): string {
  try {
    return new URL(databaseUrl).hostname;
  } catch {
    const m = databaseUrl.match(/@([^:/]+)/);
    return m ? m[1] : '';
  }
}

export interface DbSafetyResult {
  safe: boolean;
  message: string;
  zephixEnv: string;
  dbHost: string;
}

function isInternalHost(host: string): boolean {
  return host.endsWith('.railway.internal');
}

function belongsToEnv(
  host: string,
  env: 'production' | 'staging' | 'test',
): boolean {
  switch (env) {
    case 'production':
      return PRODUCTION_PROXY_HOSTS.includes(host);
    case 'staging':
      return STAGING_PROXY_HOSTS.includes(host);
    case 'test':
      return TEST_PROXY_HOSTS.includes(host);
  }
}

/**
 * Validates that the ZEPHIX_ENV and DATABASE_URL host are not cross-wired.
 * Returns { safe, message, zephixEnv, dbHost }.
 *
 * Rules:
 *   - Internal hostnames (*.railway.internal) are always allowed — Railway
 *     scopes DNS per environment, so postgres.railway.internal is safe everywhere.
 *   - Public proxy hostnames must match the declared ZEPHIX_ENV.
 *   - Empty ZEPHIX_ENV is allowed (local dev, no guard needed).
 */
export function validateDbWiring(
  zephixEnv: string,
  databaseUrl: string,
): DbSafetyResult {
  const dbHost = extractDbHost(databaseUrl);

  // No ZEPHIX_ENV = local dev, skip guard
  if (!zephixEnv) {
    return {
      safe: true,
      message: `ZEPHIX_ENV not set (local dev) — guard skipped`,
      zephixEnv,
      dbHost,
    };
  }

  // Internal Railway hostnames are environment-scoped — always safe
  if (isInternalHost(dbHost)) {
    return {
      safe: true,
      message: `ZEPHIX_ENV=${zephixEnv}, dbHost=${dbHost} (Railway internal, env-scoped) — OK`,
      zephixEnv,
      dbHost,
    };
  }

  // Localhost / other non-Railway hosts — allow (local dev, CI, etc.)
  const isProxyHost =
    PRODUCTION_PROXY_HOSTS.includes(dbHost) ||
    STAGING_PROXY_HOSTS.includes(dbHost) ||
    TEST_PROXY_HOSTS.includes(dbHost);

  if (!isProxyHost) {
    return {
      safe: true,
      message: `ZEPHIX_ENV=${zephixEnv}, dbHost=${dbHost} (non-Railway host) — OK`,
      zephixEnv,
      dbHost,
    };
  }

  // Public proxy host — must match ZEPHIX_ENV
  const envKey = zephixEnv as 'production' | 'staging' | 'test';
  if (!['production', 'staging', 'test'].includes(envKey)) {
    return {
      safe: true,
      message: `ZEPHIX_ENV=${zephixEnv} (unknown env, no proxy guard) — OK`,
      zephixEnv,
      dbHost,
    };
  }

  if (belongsToEnv(dbHost, envKey)) {
    return {
      safe: true,
      message: `ZEPHIX_ENV=${zephixEnv}, dbHost=${dbHost} (correct proxy) — OK`,
      zephixEnv,
      dbHost,
    };
  }

  // Determine which environment the proxy actually belongs to
  let actualEnv = 'unknown';
  if (PRODUCTION_PROXY_HOSTS.includes(dbHost)) actualEnv = 'production';
  if (STAGING_PROXY_HOSTS.includes(dbHost)) actualEnv = 'staging';
  if (TEST_PROXY_HOSTS.includes(dbHost)) actualEnv = 'test';

  return {
    safe: false,
    message: `ZEPHIX_ENV=${zephixEnv} but DB proxy host "${dbHost}" belongs to ${actualEnv}. Cross-environment DB connection BLOCKED.`,
    zephixEnv,
    dbHost,
  };
}
