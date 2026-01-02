import { resolveCommitSha, CommitShaResult } from './commit-sha.resolver';

describe('CommitShaResolver', () => {
  const originalEnv = process.env;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    delete process.env.RAILWAY_GIT_COMMIT_SHA;
    delete process.env.GIT_COMMIT_SHA;
    delete process.env.APP_COMMIT_SHA;
  });

  afterEach(() => {
    process.env = originalEnv;
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('Priority order', () => {
    it('should use RAILWAY_GIT_COMMIT_SHA first', () => {
      process.env.RAILWAY_GIT_COMMIT_SHA = 'railway-sha-123';
      process.env.GIT_COMMIT_SHA = 'git-sha-456';
      process.env.APP_COMMIT_SHA = 'app-sha-789';

      const result = resolveCommitSha();

      expect(result.commitSha).toBe('railway-sha-123');
      expect(result.commitShaTrusted).toBe(true);
      expect(result.source).toBe('RAILWAY_GIT_COMMIT_SHA');
    });

    it('should use GIT_COMMIT_SHA when RAILWAY_GIT_COMMIT_SHA is missing', () => {
      delete process.env.RAILWAY_GIT_COMMIT_SHA;
      process.env.GIT_COMMIT_SHA = 'git-sha-456';
      process.env.APP_COMMIT_SHA = 'app-sha-789';

      const result = resolveCommitSha();

      expect(result.commitSha).toBe('git-sha-456');
      expect(result.commitShaTrusted).toBe(true);
      expect(result.source).toBe('GIT_COMMIT_SHA');
    });

    it('should use APP_COMMIT_SHA in non-production when others missing', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.RAILWAY_GIT_COMMIT_SHA;
      delete process.env.GIT_COMMIT_SHA;
      process.env.APP_COMMIT_SHA = 'app-sha-789';

      const result = resolveCommitSha();

      expect(result.commitSha).toBe('app-sha-789');
      expect(result.commitShaTrusted).toBe(true);
      expect(result.source).toBe('APP_COMMIT_SHA');
    });
  });

  describe('Production behavior', () => {
    it('should ignore APP_COMMIT_SHA in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.RAILWAY_GIT_COMMIT_SHA;
      delete process.env.GIT_COMMIT_SHA;
      process.env.APP_COMMIT_SHA = 'app-sha-789';

      const result = resolveCommitSha();

      expect(result.commitSha).toBe('unknown');
      expect(result.commitShaTrusted).toBe(false);
      expect(result.source).toBe('unknown');
    });

    it('should return untrusted unknown in production when RAILWAY_GIT_COMMIT_SHA missing', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.RAILWAY_GIT_COMMIT_SHA;
      delete process.env.GIT_COMMIT_SHA;
      delete process.env.APP_COMMIT_SHA;

      const result = resolveCommitSha();

      expect(result.commitSha).toBe('unknown');
      expect(result.commitShaTrusted).toBe(false);
      expect(result.source).toBe('unknown');
    });

    it('should return trusted in production when RAILWAY_GIT_COMMIT_SHA present', () => {
      process.env.NODE_ENV = 'production';
      process.env.RAILWAY_GIT_COMMIT_SHA = 'railway-sha-123';

      const result = resolveCommitSha();

      expect(result.commitSha).toBe('railway-sha-123');
      expect(result.commitShaTrusted).toBe(true);
      expect(result.source).toBe('RAILWAY_GIT_COMMIT_SHA');
    });
  });

  describe('Non-production behavior', () => {
    it('should use APP_COMMIT_SHA in development when others missing', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.RAILWAY_GIT_COMMIT_SHA;
      delete process.env.GIT_COMMIT_SHA;
      process.env.APP_COMMIT_SHA = 'app-sha-789';

      const result = resolveCommitSha();

      expect(result.commitSha).toBe('app-sha-789');
      expect(result.commitShaTrusted).toBe(true);
      expect(result.source).toBe('APP_COMMIT_SHA');
    });

    it('should return trusted unknown in development when all missing', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.RAILWAY_GIT_COMMIT_SHA;
      delete process.env.GIT_COMMIT_SHA;
      delete process.env.APP_COMMIT_SHA;

      const result = resolveCommitSha();

      expect(result.commitSha).toBe('unknown');
      expect(result.commitShaTrusted).toBe(true); // Trusted in dev
      expect(result.source).toBe('unknown');
    });
  });

  describe('Fallback behavior', () => {
    it('should return unknown when all sources are missing', () => {
      delete process.env.RAILWAY_GIT_COMMIT_SHA;
      delete process.env.GIT_COMMIT_SHA;
      delete process.env.APP_COMMIT_SHA;
      delete process.env.NODE_ENV;

      const result = resolveCommitSha();

      expect(result.commitSha).toBe('unknown');
      expect(result.source).toBe('unknown');
    });
  });
});

