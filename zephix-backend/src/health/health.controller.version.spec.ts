import { HealthController } from './health.controller';
import * as fs from 'fs';
import * as path from 'path';

describe('HealthController /api/version contract', () => {
  const buildMetaPath = path.join(process.cwd(), 'dist', 'build-meta.json');
  const removeBuildMeta = () => {
    try {
      if (fs.existsSync(buildMetaPath)) {
        fs.unlinkSync(buildMetaPath);
      }
    } catch {
      // Ignore cleanup failures in tests.
    }
  };

  const originalEnv = {
    GIT_SHA: process.env.GIT_SHA,
    COMMIT_SHA: process.env.COMMIT_SHA,
    SOURCE_VERSION: process.env.SOURCE_VERSION,
    BUILD_TIME: process.env.BUILD_TIME,
    ZEPHIX_ENV: process.env.ZEPHIX_ENV,
    NODE_ENV: process.env.NODE_ENV,
    RAILWAY_DEPLOYMENT_ID: process.env.RAILWAY_DEPLOYMENT_ID,
  };

  beforeEach(() => {
    removeBuildMeta();
  });

  afterEach(() => {
    process.env.GIT_SHA = originalEnv.GIT_SHA;
    process.env.COMMIT_SHA = originalEnv.COMMIT_SHA;
    process.env.SOURCE_VERSION = originalEnv.SOURCE_VERSION;
    process.env.BUILD_TIME = originalEnv.BUILD_TIME;
    process.env.ZEPHIX_ENV = originalEnv.ZEPHIX_ENV;
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    process.env.RAILWAY_DEPLOYMENT_ID = originalEnv.RAILWAY_DEPLOYMENT_ID;
  });

  afterAll(() => {
    removeBuildMeta();
  });

  it('returns a flat payload (not wrapped) with stable keys', async () => {
    process.env.COMMIT_SHA = '1111111111111111111111111111111111111111';
    process.env.BUILD_TIME = '2026-02-24T00:00:00.000Z';
    process.env.ZEPHIX_ENV = 'staging';
    process.env.NODE_ENV = 'staging';
    process.env.RAILWAY_DEPLOYMENT_ID = 'deploy-123';

    const controller = new HealthController(undefined, undefined);
    const payload = await controller.version();

    expect(payload).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          commitSha: '1111111111111111111111111111111111111111',
          commitShaTrusted: true,
          buildTime: '2026-02-24T00:00:00.000Z',
          zephixEnv: 'staging',
          nodeEnv: 'staging',
          railwayDeploymentId: 'deploy-123',
        }),
        gitSha: '1111111111111111111111111111111111111111',
        commitSha: '1111111111111111111111111111111111111111',
        commitShaTrusted: true,
        buildTime: '2026-02-24T00:00:00.000Z',
        zephixEnv: 'staging',
        nodeEnv: 'staging',
        railwayDeploymentId: 'deploy-123',
      }),
    );
  });

  it('returns unknown commit markers when no commit env vars are set', async () => {
    delete process.env.GIT_SHA;
    delete process.env.COMMIT_SHA;
    delete process.env.SOURCE_VERSION;
    process.env.BUILD_TIME = '';
    process.env.ZEPHIX_ENV = 'staging';
    process.env.NODE_ENV = 'staging';
    process.env.RAILWAY_DEPLOYMENT_ID = 'deploy-unknown';

    const controller = new HealthController(undefined, undefined);
    const payload = await controller.version();

    expect(payload).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          commitSha: 'unknown',
          commitShaTrusted: false,
        }),
        commitSha: 'unknown',
        commitShaTrusted: false,
        gitSha: 'unknown',
      }),
    );
  });

  it('ignores untrusted build-meta commit and falls back to trusted COMMIT_SHA', async () => {
    fs.mkdirSync(path.dirname(buildMetaPath), { recursive: true });
    fs.writeFileSync(
      buildMetaPath,
      JSON.stringify({
        commitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        commitShaTrusted: false,
        buildTime: '2026-02-24T00:00:00.000Z',
      }),
    );
    process.env.COMMIT_SHA = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    process.env.ZEPHIX_ENV = 'staging';
    process.env.NODE_ENV = 'staging';

    const controller = new HealthController(undefined, undefined);
    const setHeader = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();
    const res = { setHeader, json } as any;

    await controller.version(res);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          commitSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          commitShaTrusted: true,
        }),
        commitSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        commitShaTrusted: true,
      }),
    );
  });
});
