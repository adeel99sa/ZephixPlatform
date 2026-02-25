import * as fs from 'fs';
import * as path from 'path';

export interface CommitShaResolution {
  commitSha: string | null;
  commitShaTrusted: boolean;
  sourceKey: string | null;
  sourceType: 'build-meta' | 'operator' | 'fallback' | 'none';
  attemptedBuildMetaPaths: string[];
}

const OPERATOR_TRUSTED_COMMIT_KEYS = ['COMMIT_SHA'] as const;
const FALLBACK_COMMIT_KEYS = ['GIT_SHA', 'SOURCE_VERSION'] as const;
const EXACT_SHA_PATTERN = /^[0-9a-f]{40}$/i;

function readEnvVar(key: string): string | null {
  const value = process.env[key];
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveBuildMetaPaths(): string[] {
  return [
    path.resolve(path.join(process.cwd(), 'dist', 'build-meta.json')),
    path.resolve(path.join(process.cwd(), 'zephix-backend', 'dist', 'build-meta.json')),
    path.resolve(path.join(__dirname, '../../..', 'build-meta.json')),
    path.resolve(path.join(__dirname, '../../../..', 'build-meta.json')),
    path.resolve(path.join(__dirname, '../../../../build-meta.json')),
  ];
}

function resolveFromBuildMeta(paths: string[]): string | null {
  for (const candidate of paths) {
    try {
      if (!fs.existsSync(candidate)) {
        continue;
      }
      const raw = fs.readFileSync(candidate, 'utf8');
      const parsed = JSON.parse(raw) as { commitSha?: string };
      const commitSha =
        typeof parsed.commitSha === 'string' ? parsed.commitSha.trim() : '';
      if (EXACT_SHA_PATTERN.test(commitSha)) {
        return commitSha;
      }
    } catch {
      // Ignore parse/file errors and continue to next path.
    }
  }
  return null;
}

export function resolveCommitShaDetails(): CommitShaResolution {
  const attemptedBuildMetaPaths = resolveBuildMetaPaths();
  const buildMetaCommit = resolveFromBuildMeta(attemptedBuildMetaPaths);
  if (buildMetaCommit) {
    return {
      commitSha: buildMetaCommit,
      commitShaTrusted: true,
      sourceKey: 'build-meta.json',
      sourceType: 'build-meta',
      attemptedBuildMetaPaths,
    };
  }

  for (const key of OPERATOR_TRUSTED_COMMIT_KEYS) {
    const value = readEnvVar(key);
    if (value && EXACT_SHA_PATTERN.test(value)) {
      return {
        commitSha: value,
        commitShaTrusted: true,
        sourceKey: key,
        sourceType: 'operator',
        attemptedBuildMetaPaths,
      };
    }
  }

  for (const key of FALLBACK_COMMIT_KEYS) {
    const value = readEnvVar(key);
    if (value) {
      return {
        commitSha: value,
        commitShaTrusted: false,
        sourceKey: key,
        sourceType: 'fallback',
        attemptedBuildMetaPaths,
      };
    }
  }

  return {
    commitSha: null,
    commitShaTrusted: false,
    sourceKey: null,
    sourceType: 'none',
    attemptedBuildMetaPaths,
  };
}

export function resolveCommitSha(): string | null {
  return resolveCommitShaDetails().commitSha;
}

export function resolveBuildTime(): {
  buildTime: string | null;
  railwayDeploymentId: string | null;
} {
  const buildTime =
    typeof process.env.BUILD_TIME === 'string' &&
    process.env.BUILD_TIME.trim().length > 0
      ? process.env.BUILD_TIME.trim()
      : null;

  const railwayDeploymentId =
    typeof process.env.RAILWAY_DEPLOYMENT_ID === 'string' &&
    process.env.RAILWAY_DEPLOYMENT_ID.trim().length > 0
      ? process.env.RAILWAY_DEPLOYMENT_ID.trim()
      : null;

  return { buildTime, railwayDeploymentId };
}

