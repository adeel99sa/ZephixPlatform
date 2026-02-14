/**
 * DB Safety Guard — prevents environment↔database cross-wiring.
 *
 * Known Railway Postgres hosts:
 *   Production: postgres.railway.internal, ballast.proxy.rlwy.net
 *   Staging:    postgres-jj7b.railway.internal
 *   Test:       yamabiko.proxy.rlwy.net (test Postgres public proxy)
 *
 * Rules:
 *   - staging must never connect to production Postgres
 *   - production must never connect to staging Postgres
 *   - test has its own Postgres; no cross-wiring checks yet
 */

export const PRODUCTION_DB_HOSTS = [
  'postgres.railway.internal',
  'ballast.proxy.rlwy.net',
];

export const STAGING_DB_HOST = 'postgres-jj7b.railway.internal';

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

/**
 * Validates that the ZEPHIX_ENV and DATABASE_URL host are not cross-wired.
 * Returns { safe, message, zephixEnv, dbHost }.
 */
export function validateDbWiring(
  zephixEnv: string,
  databaseUrl: string,
): DbSafetyResult {
  const dbHost = extractDbHost(databaseUrl);

  if (zephixEnv === 'staging' && PRODUCTION_DB_HOSTS.includes(dbHost)) {
    return {
      safe: false,
      message: `ZEPHIX_ENV=staging but DB host is "${dbHost}" (production). Staging must NEVER use production Postgres.`,
      zephixEnv,
      dbHost,
    };
  }

  if (zephixEnv === 'production' && dbHost === STAGING_DB_HOST) {
    return {
      safe: false,
      message: `ZEPHIX_ENV=production but DB host is "${dbHost}" (staging). Production must NEVER use staging Postgres.`,
      zephixEnv,
      dbHost,
    };
  }

  return {
    safe: true,
    message: `ZEPHIX_ENV=${zephixEnv}, dbHost=${dbHost} — OK`,
    zephixEnv,
    dbHost,
  };
}
