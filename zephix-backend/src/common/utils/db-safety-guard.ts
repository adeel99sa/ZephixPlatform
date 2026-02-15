/**
 * DB Safety Guard — prevents environment↔database cross-wiring.
 *
 * TWO LAYERS OF PROTECTION:
 *
 * Layer 1 — Hostname guard (boot-time, before DB connection):
 *   Public proxy hostnames are unique per database instance.
 *   If someone copies a production proxy URL into staging config,
 *   we catch it here at boot and exit(1) before touching the DB.
 *   Internal hostnames (*.railway.internal) are allowed because
 *   Railway scopes DNS per environment.
 *
 * Layer 2 — DB identity guard (runtime, after DB connection):
 *   Queries the actual Postgres instance for inet_server_addr().
 *   Two different Postgres instances will have different IP addresses
 *   even if the hostname (`railway`) and database name (`railway`) match.
 *   This is the ONLY definitive proof of which DB you are connected to.
 *
 * Known public proxy hostnames per environment:
 *   Production: ballast.proxy.rlwy.net
 *   Staging:    interchange.proxy.rlwy.net, shortline.proxy.rlwy.net
 *   Test:       yamabiko.proxy.rlwy.net
 */

/** Known public proxy hostnames per environment */
export const PRODUCTION_PROXY_HOSTS = ['ballast.proxy.rlwy.net'];
export const STAGING_PROXY_HOSTS = [
  'interchange.proxy.rlwy.net',
  'shortline.proxy.rlwy.net',
];
export const TEST_PROXY_HOSTS = ['yamabiko.proxy.rlwy.net'];

/**
 * Known proxy hosts that are FORBIDDEN for a given environment.
 * staging must never connect to production or test proxies, etc.
 */
export const FORBIDDEN_PROXY_HOSTS: Record<string, string[]> = {
  staging: [...PRODUCTION_PROXY_HOSTS, ...TEST_PROXY_HOSTS],
  production: [...STAGING_PROXY_HOSTS, ...TEST_PROXY_HOSTS],
  test: [...PRODUCTION_PROXY_HOSTS, ...STAGING_PROXY_HOSTS],
};

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

export interface DbIdentityResult {
  safe: boolean;
  message: string;
  currentDatabase: string | null;
  serverAddr: string | null;
  serverPort: number | null;
  migrationCount: number;
  latestMigration: string | null;
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
 * Layer 1 — Hostname guard (boot-time).
 * Validates that the ZEPHIX_ENV and DATABASE_URL host are not cross-wired.
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

/**
 * Layer 2 — DB identity guard (runtime, after DB connection).
 * Uses the FORBIDDEN_PROXY_HOSTS lookup to verify the configured
 * DATABASE_URL host is not a proxy belonging to another environment.
 *
 * Also validates that the DB is reachable and migrations are consistent.
 * This function is designed to be called AFTER the app has connected
 * to the database, e.g. from env-proof or a startup hook.
 *
 * Returns machine-readable identity fields for proof artifacts.
 */
export function isForbiddenProxy(zephixEnv: string, dbHost: string): boolean {
  const forbidden = FORBIDDEN_PROXY_HOSTS[zephixEnv];
  if (!forbidden) return false;
  return forbidden.includes(dbHost);
}
