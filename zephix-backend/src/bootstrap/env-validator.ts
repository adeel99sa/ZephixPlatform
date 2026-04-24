import { Logger } from '@nestjs/common';

/**
 * Environment validation for Zephix backend.
 *
 * Design principle:
 * - NODE_ENV is the Node.js ecosystem convention (development | test | production).
 *   It controls framework-level behavior: error verbosity, logging, optimizations.
 * - ZEPHIX_ENV is the application-level environment distinction (development | staging | production).
 *   It controls business logic: DB safety guard, email bypass, CORS, staging-only features.
 *
 * This validator runs at process startup (before DB wiring guard) so misconfiguration
 * aborts before silent skips (e.g. empty ZEPHIX_ENV + DB guard).
 *
 * NOTE: `bootstrap()` in main.ts also validates JWT/pepper/integration keys — defense
 * in depth. Do not remove one without consolidating. See main.ts comment near requiredEnvVars.
 */

const logger = new Logger('EnvValidator');

export const VALID_NODE_ENVS = ['development', 'test', 'production'] as const;
export const VALID_ZEPHIX_ENVS = ['development', 'staging', 'production'] as const;

export type NodeEnv = (typeof VALID_NODE_ENVS)[number];
export type ZephixEnv = (typeof VALID_ZEPHIX_ENVS)[number];

/**
 * Secrets required when NODE_ENV=production.
 * Length validation (≥32 chars) is enforced for values containing SECRET/PEPPER/KEY.
 */
const REQUIRED_PRODUCTION_SECRETS = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'REFRESH_TOKEN_PEPPER',
  'INTEGRATION_ENCRYPTION_KEY',
] as const;

const MIN_SECRET_LENGTH = 32;

export interface EnvValidationResult {
  errors: string[];
  warnings: string[];
  nodeEnv: string | undefined;
  zephixEnv: string | undefined;
}

/**
 * Pure function — validates environment variables and returns errors/warnings.
 * Does not exit the process. Used by `assertValidEnvironment` and unit tests.
 */
export function validateEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const nodeEnv = env.NODE_ENV;
  const zephixEnv = env.ZEPHIX_ENV;

  // 1. NODE_ENV validation
  if (!nodeEnv) {
    errors.push(
      'NODE_ENV is not set. Required values: ' + VALID_NODE_ENVS.join(' | '),
    );
  } else if (!VALID_NODE_ENVS.includes(nodeEnv as NodeEnv)) {
    // TRANSITIONAL: Staging historically ran with NODE_ENV=staging (non-standard).
    // Warn instead of failing so Railway staging can boot during the migration to
    // NODE_ENV=production + ZEPHIX_ENV=staging. Remove after Session 7 migration.
    if (nodeEnv === 'staging') {
      warnings.push(
        `TransitionalNodeEnvWarning: NODE_ENV="staging" is not a standard Node.js value. ` +
          `The Node ecosystem recognizes only: ${VALID_NODE_ENVS.join(' | ')}. ` +
          `ACTION REQUIRED: On Railway staging, set NODE_ENV=production and keep ` +
          `ZEPHIX_ENV=staging. Staging should mirror production framework behavior. ` +
          `This warning will become a fatal error in a future release.`,
      );
    } else {
      errors.push(
        `NODE_ENV="${nodeEnv}" is not a valid Node.js environment. ` +
          `Valid values: ${VALID_NODE_ENVS.join(' | ')}. ` +
          `Use ZEPHIX_ENV for staging/production distinction.`,
      );
    }
  }

  // 2. ZEPHIX_ENV validation (context-dependent)
  if (!zephixEnv) {
    if (nodeEnv === 'production') {
      errors.push(
        'ZEPHIX_ENV is required when NODE_ENV=production. ' +
          'Valid values: ' +
          VALID_ZEPHIX_ENVS.join(' | '),
      );
    } else if (nodeEnv === 'development') {
      warnings.push(
        'ZEPHIX_ENV is not set. Defaulting behavior to development. ' +
          'For clarity, set ZEPHIX_ENV=development in your local .env file.',
      );
    }
    // NODE_ENV=test: silent (test runners may not set ZEPHIX_ENV)
  } else if (!VALID_ZEPHIX_ENVS.includes(zephixEnv as ZephixEnv)) {
    errors.push(
      `ZEPHIX_ENV="${zephixEnv}" is invalid. ` +
        `Valid values: ${VALID_ZEPHIX_ENVS.join(' | ')}`,
    );
  }

  // 3. Cross-variable consistency
  if (nodeEnv === 'development' && zephixEnv && zephixEnv !== 'development') {
    warnings.push(
      `Inconsistent: NODE_ENV=development but ZEPHIX_ENV=${zephixEnv}. ` +
        `Local development should use ZEPHIX_ENV=development.`,
    );
  }

  if (nodeEnv === 'production' && zephixEnv === 'development') {
    errors.push(
      'Dangerous combination: NODE_ENV=production with ZEPHIX_ENV=development. ' +
        'This is never a valid deployment configuration.',
    );
  }

  // 4. Production secrets presence and length
  if (nodeEnv === 'production') {
    for (const key of REQUIRED_PRODUCTION_SECRETS) {
      const val = env[key];
      if (!val || val.trim().length === 0) {
        errors.push(`Missing required secret: ${key}`);
        continue;
      }

      const isSecretMaterial =
        key.includes('SECRET') || key.includes('PEPPER') || key.includes('KEY');

      if (isSecretMaterial && val.length < MIN_SECRET_LENGTH) {
        errors.push(
          `${key} is too short (${val.length} characters). ` +
            `Minimum required: ${MIN_SECRET_LENGTH}.`,
        );
      }
    }
  }

  return { errors, warnings, nodeEnv, zephixEnv };
}

/**
 * Asserts the environment is valid. Logs warnings. On errors, logs and exits process.
 * Call from main.ts at top-level, before DB safety guard.
 *
 * Skipped when Jest/Vitest loads this module so test runners are not forced to satisfy
 * full production env (bootstrap() already returns early for the same signals).
 */
export function assertValidEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (env.JEST_WORKER_ID || env.VITEST) {
    return;
  }

  const result = validateEnvironment(env);

  for (const warning of result.warnings) {
    logger.warn(warning);
  }

  if (result.errors.length > 0) {
    logger.error('═══════════════════════════════════════════════════════');
    logger.error('ENVIRONMENT VALIDATION FAILED — aborting startup');
    logger.error('═══════════════════════════════════════════════════════');
    for (const error of result.errors) {
      logger.error(`  • ${error}`);
    }
    logger.error('═══════════════════════════════════════════════════════');
    logger.error(
      'Fix the environment configuration and redeploy. ' +
        'Starting the service with invalid config is disallowed.',
    );
    process.exit(78);
  }

  logger.log(
    `Environment validated: NODE_ENV=${result.nodeEnv || '(unset)'}, ` +
      `ZEPHIX_ENV=${result.zephixEnv || '(unset)'}`,
  );
}
