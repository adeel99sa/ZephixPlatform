/**
 * DB Safety Guard — prevents environment↔database cross-wiring.
 *
 * Known Railway Postgres hosts:
 *   Production: postgres.railway.internal, ballast.proxy.rlwy.net
 *   Staging:    postgres-jj7b.railway.internal
 *   Test:       yamabiko.proxy.rlwy.net (test Postgres public proxy)
 *
 * Rules (enforced at boot, exit 1 on violation):
 *   - staging must NEVER connect to production or test Postgres
 *   - production must NEVER connect to staging or test Postgres
 *   - test must NEVER connect to production or staging Postgres
 */

export const PRODUCTION_DB_HOSTS = [
  'postgres.railway.internal',
  'ballast.proxy.rlwy.net',
];

export const STAGING_DB_HOST = 'postgres-jj7b.railway.internal';

export const TEST_DB_HOST = 'yamabiko.proxy.rlwy.net';

/** Hosts that staging and test must never use */
const BLOCKED_FOR_NON_PROD = [...PRODUCTION_DB_HOSTS];

/** Hosts that production must never use */
const BLOCKED_FOR_PROD = [STAGING_DB_HOST, TEST_DB_HOST];

/** Hosts that test must never use (production + staging) */
const BLOCKED_FOR_TEST = [...PRODUCTION_DB_HOSTS, STAGING_DB_HOST];

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
 *
 * Enforcement matrix:
 *   staging     → blocked: postgres.railway.internal, ballast.proxy.rlwy.net
 *   production  → blocked: postgres-jj7b.railway.internal, yamabiko.proxy.rlwy.net
 *   test        → blocked: postgres.railway.internal, ballast.proxy.rlwy.net, postgres-jj7b.railway.internal
 */
export function validateDbWiring(
  zephixEnv: string,
  databaseUrl: string,
): DbSafetyResult {
  const dbHost = extractDbHost(databaseUrl);

  if (zephixEnv === 'staging' && BLOCKED_FOR_NON_PROD.includes(dbHost)) {
    return {
      safe: false,
      message: `ZEPHIX_ENV=staging but DB host is "${dbHost}" (production). Staging must NEVER use production Postgres.`,
      zephixEnv,
      dbHost,
    };
  }

  if (zephixEnv === 'production' && BLOCKED_FOR_PROD.includes(dbHost)) {
    return {
      safe: false,
      message: `ZEPHIX_ENV=production but DB host is "${dbHost}" (${dbHost === STAGING_DB_HOST ? 'staging' : 'test'}). Production must NEVER use non-production Postgres.`,
      zephixEnv,
      dbHost,
    };
  }

  if (zephixEnv === 'test' && BLOCKED_FOR_TEST.includes(dbHost)) {
    return {
      safe: false,
      message: `ZEPHIX_ENV=test but DB host is "${dbHost}" (${PRODUCTION_DB_HOSTS.includes(dbHost) ? 'production' : 'staging'}). Test must NEVER use production or staging Postgres.`,
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
