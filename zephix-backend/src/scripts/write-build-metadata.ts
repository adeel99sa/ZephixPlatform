import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

type SourceType = 'operator' | 'provider' | 'git' | 'fallback' | 'none';
const EXACT_SHA_PATTERN = /^[0-9a-f]{40}$/i;

function readEnv(key: string): string | null {
  const value = process.env[key];
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function pickCommitFromEnv(): {
  commitSha: string | null;
  trusted: boolean;
  sourceKey: string | null;
  sourceType: SourceType;
} {
  const operator = readEnv('COMMIT_SHA');
  if (operator && EXACT_SHA_PATTERN.test(operator)) {
    return {
      commitSha: operator,
      trusted: true,
      sourceKey: 'COMMIT_SHA',
      sourceType: 'operator',
    };
  }

  const providerKeys = [
    'RAILWAY_GIT_COMMIT_SHA',
    'RAILWAY_GIT_COMMIT_HASH',
    'RAILWAY_GIT_SHA',
    'GITHUB_SHA',
    'VERCEL_GIT_COMMIT_SHA',
    'RENDER_GIT_COMMIT',
  ];
  for (const key of providerKeys) {
    const value = readEnv(key);
    if (value && EXACT_SHA_PATTERN.test(value)) {
      return {
        commitSha: value,
        trusted: true,
        sourceKey: key,
        sourceType: 'provider',
      };
    }
  }

  const fallbackKeys = ['SOURCE_VERSION', 'GIT_SHA'];
  for (const key of fallbackKeys) {
    const value = readEnv(key);
    if (value && EXACT_SHA_PATTERN.test(value)) {
      return {
        commitSha: value,
        trusted: false,
        sourceKey: key,
        sourceType: 'fallback',
      };
    }
  }

  return {
    commitSha: null,
    trusted: false,
    sourceKey: null,
    sourceType: 'none',
  };
}

function pickCommitFromGit(): {
  commitSha: string | null;
  trusted: boolean;
  sourceKey: string | null;
  sourceType: SourceType;
} {
  try {
    const sha = execSync('git rev-parse HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();

    if (EXACT_SHA_PATTERN.test(sha)) {
      return {
        commitSha: sha,
        trusted: true,
        sourceKey: 'git rev-parse HEAD',
        sourceType: 'git',
      };
    }
  } catch {
    // Ignore git lookup failures.
  }

  return {
    commitSha: null,
    trusted: false,
    sourceKey: null,
    sourceType: 'none',
  };
}

function writeBuildMetadata(): void {
  const buildTime = new Date().toISOString();
  const envPick = pickCommitFromEnv();
  const gitPick = envPick.commitSha ? null : pickCommitFromGit();

  const commitSha = envPick.commitSha ?? gitPick?.commitSha ?? 'unknown';
  const commitShaTrusted = envPick.commitSha
    ? envPick.trusted
    : (gitPick?.trusted ?? false);
  const sourceKey = envPick.commitSha
    ? envPick.sourceKey
    : (gitPick?.sourceKey ?? null);
  const sourceType = envPick.commitSha
    ? envPick.sourceType
    : (gitPick?.sourceType ?? 'none');

  const distDir = path.join(process.cwd(), 'dist');
  const targetPath = path.join(distDir, 'build-meta.json');

  try {
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    fs.writeFileSync(
      targetPath,
      JSON.stringify(
        { commitSha, commitShaTrusted, sourceKey, sourceType, buildTime },
        null,
        2,
      ),
      'utf8',
    );
  } catch {
    // Never fail build due to metadata writing.
  }
}

writeBuildMetadata();

