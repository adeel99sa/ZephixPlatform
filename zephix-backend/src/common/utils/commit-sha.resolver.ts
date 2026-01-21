import { Logger } from '@nestjs/common';

export interface CommitShaResult {
  commitSha: string;
  commitShaTrusted: boolean;
  source:
    | 'RAILWAY_GIT_COMMIT_SHA'
    | 'GIT_COMMIT_SHA'
    | 'APP_COMMIT_SHA'
    | 'unknown';
}

/**
 * Resolves commit SHA from environment variables in priority order:
 * 1. RAILWAY_GIT_COMMIT_SHA (Railway auto-injected)
 * 2. GIT_COMMIT_SHA (CI/CD or manual)
 * 3. APP_COMMIT_SHA (only in non-production environments)
 *
 * In production, if RAILWAY_GIT_COMMIT_SHA is missing, returns 'unknown' with trusted=false.
 */
export function resolveCommitSha(): CommitShaResult {
  const isProduction = process.env.NODE_ENV === 'production';
  const railwaySha = process.env.RAILWAY_GIT_COMMIT_SHA;
  const gitSha = process.env.GIT_COMMIT_SHA;
  const appSha = process.env.APP_COMMIT_SHA;

  // Priority 1: RAILWAY_GIT_COMMIT_SHA (Railway auto-injected)
  if (railwaySha) {
    return {
      commitSha: railwaySha,
      commitShaTrusted: true,
      source: 'RAILWAY_GIT_COMMIT_SHA',
    };
  }

  // Priority 2: GIT_COMMIT_SHA (CI/CD or manual)
  if (gitSha) {
    return {
      commitSha: gitSha,
      commitShaTrusted: true,
      source: 'GIT_COMMIT_SHA',
    };
  }

  // Priority 3: APP_COMMIT_SHA (only in non-production)
  if (appSha && !isProduction) {
    return {
      commitSha: appSha,
      commitShaTrusted: true,
      source: 'APP_COMMIT_SHA',
    };
  }

  // Fallback: unknown
  // In production, if RAILWAY_GIT_COMMIT_SHA is missing, mark as untrusted
  return {
    commitSha: 'unknown',
    commitShaTrusted: !isProduction, // Trusted in dev, untrusted in prod if missing
    source: 'unknown',
  };
}

/**
 * Log commit SHA at startup with source information
 */
export function logCommitSha(logger: Logger): void {
  const result = resolveCommitSha();
  const sourceLabel =
    result.source === 'unknown' ? 'none (using fallback)' : result.source;
  const trustedLabel = result.commitShaTrusted ? '✅ trusted' : '⚠️  untrusted';

  logger.log(
    `📦 Application Commit SHA: ${result.commitSha} (source: ${sourceLabel}, ${trustedLabel})`,
  );
}
