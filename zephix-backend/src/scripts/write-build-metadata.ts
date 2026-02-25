import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface BuildMeta {
  commitSha: string;
  buildTime: string;
}

function resolveCommitSha(): string {
  try {
    const sha = execSync('git rev-parse HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();

    if (/^[0-9a-f]{40}$/i.test(sha)) {
      return sha;
    }
  } catch {
    // Ignore git lookup failures and use fallback.
  }

  return 'unknown';
}

function writeBuildMetadata(): void {
  const targetPath = path.join(process.cwd(), 'dist', 'build-meta.json');
  const payload: BuildMeta = {
    commitSha: resolveCommitSha(),
    buildTime: new Date().toISOString(),
  };

  try {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, JSON.stringify(payload));
  } catch {
    // Never fail build due to metadata writing.
  }
}

writeBuildMetadata();

