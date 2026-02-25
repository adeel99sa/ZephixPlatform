import {
  resolveBuildTime,
  resolveCommitSha,
  resolveCommitShaDetails,
} from './commit-sha';
import * as fs from 'fs';
import * as path from 'path';

describe('resolveCommitSha', () => {
  const originalEnv = { ...process.env };
  const originalCwd = process.cwd();
  const buildMetaPath = () => path.join(process.cwd(), 'dist', 'build-meta.json');

  const removeBuildMeta = () => {
    try {
      const target = buildMetaPath();
      if (fs.existsSync(target)) {
        fs.unlinkSync(target);
      }
    } catch {
      // Ignore cleanup failures in tests.
    }
  };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.COMMIT_SHA;
    delete process.env.GIT_SHA;
    delete process.env.SOURCE_VERSION;
    delete process.env.BUILD_TIME;
    delete process.env.RAILWAY_DEPLOYMENT_ID;
    process.chdir(originalCwd);
    removeBuildMeta();
  });

  afterAll(() => {
    process.env = originalEnv;
    process.chdir(originalCwd);
    removeBuildMeta();
  });

  it('returns trusted commit SHA from build-meta.json when a valid 40-hex exists', () => {
    fs.mkdirSync(path.dirname(buildMetaPath()), { recursive: true });
    fs.writeFileSync(
      buildMetaPath(),
      JSON.stringify({
        commitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        buildTime: '2026-02-25T00:00:00.000Z',
      }),
    );

    expect(resolveCommitShaDetails()).toEqual(
      expect.objectContaining({
        commitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        commitShaTrusted: true,
        sourceKey: 'build-meta.json',
        sourceType: 'build-meta',
      }),
    );
  });

  it('returns trusted commit SHA when cwd is repo root and metadata is in zephix-backend/dist', () => {
    const fixtureRoot = path.join(originalCwd, '.tmp-commit-sha-spec');
    const repoRoot = path.join(fixtureRoot, 'repo');
    const backendDist = path.join(repoRoot, 'zephix-backend', 'dist');
    fs.mkdirSync(backendDist, { recursive: true });
    fs.writeFileSync(
      path.join(backendDist, 'build-meta.json'),
      JSON.stringify({
        commitSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        buildTime: '2026-02-25T00:00:00.000Z',
      }),
    );

    process.chdir(repoRoot);
    const result = resolveCommitShaDetails();
    expect(result).toEqual(
      expect.objectContaining({
        commitSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        commitShaTrusted: true,
        sourceType: 'build-meta',
      }),
    );
    expect(result.attemptedBuildMetaPaths[1]).toBe(
      path.join(repoRoot, 'zephix-backend', 'dist', 'build-meta.json'),
    );

    process.chdir(originalCwd);
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  });

  it('returns trusted commit SHA from COMMIT_SHA when value is valid 40-hex', () => {
    process.env.COMMIT_SHA =
      '1111111111111111111111111111111111111111';

    expect(resolveCommitShaDetails()).toEqual(
      expect.objectContaining({
        commitSha: '1111111111111111111111111111111111111111',
        commitShaTrusted: true,
        sourceKey: 'COMMIT_SHA',
        sourceType: 'operator',
      }),
    );
  });

  it('returns untrusted commit SHA from fallback key when only fallback exists', () => {
    process.env.GIT_SHA = '3333333333333333333333333333333333333333';

    expect(resolveCommitShaDetails()).toEqual(
      expect.objectContaining({
        commitSha: '3333333333333333333333333333333333333333',
        commitShaTrusted: false,
        sourceKey: 'GIT_SHA',
        sourceType: 'fallback',
      }),
    );
  });

  it('returns null commit when build-meta.json is missing and no env vars exist', () => {
    expect(resolveCommitShaDetails()).toEqual(
      expect.objectContaining({
        commitSha: null,
        commitShaTrusted: false,
        sourceType: 'none',
      }),
    );
  });

  it('contains no guessed RAILWAY_GIT_* keys in resolver source', () => {
    const source = fs.readFileSync(path.join(__dirname, 'commit-sha.ts'), 'utf8');
    expect(source).not.toContain('RAILWAY_GIT_');
  });

  it('returns null from resolveCommitSha when no key is available', () => {
    expect(resolveCommitSha()).toBeNull();
  });

  it('returns null build metadata when env vars are not set', () => {
    expect(resolveBuildTime()).toEqual({
      buildTime: null,
      railwayDeploymentId: null,
    });
  });
});

