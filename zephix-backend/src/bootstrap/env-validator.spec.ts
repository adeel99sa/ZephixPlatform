import { validateEnvironment } from './env-validator';

describe('validateEnvironment', () => {
  const validProductionEnv = {
    NODE_ENV: 'production',
    ZEPHIX_ENV: 'production',
    DATABASE_URL: 'postgres://user:pass@host:5432/db',
    REDIS_URL: 'redis://host:6379',
    JWT_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    REFRESH_TOKEN_PEPPER: 'c'.repeat(32),
    INTEGRATION_ENCRYPTION_KEY: 'd'.repeat(32),
  };

  describe('NODE_ENV validation', () => {
    it('accepts development, test, production', () => {
      for (const nodeEnv of ['development', 'test', 'production']) {
        const env =
          nodeEnv === 'production'
            ? { ...validProductionEnv, NODE_ENV: nodeEnv }
            : { NODE_ENV: nodeEnv, ZEPHIX_ENV: 'development' };
        const result = validateEnvironment(env);
        expect(result.errors).toEqual([]);
      }
    });

    it('rejects NODE_ENV="staging"', () => {
      const result = validateEnvironment({
        NODE_ENV: 'staging',
        ZEPHIX_ENV: 'staging',
      });
      expect(
        result.errors.some((e) => e.includes('NODE_ENV="staging"')),
      ).toBe(true);
      expect(result.warnings).toEqual([]);
    });

    it('rejects empty NODE_ENV', () => {
      const result = validateEnvironment({ ZEPHIX_ENV: 'development' });
      expect(
        result.errors.some((e) => e.includes('NODE_ENV is not set')),
      ).toBe(true);
    });

    it('rejects other invalid NODE_ENV values', () => {
      const result = validateEnvironment({
        NODE_ENV: 'banana',
        ZEPHIX_ENV: 'staging',
      });
      expect(
        result.errors.some((e) => e.includes('NODE_ENV="banana"')),
      ).toBe(true);
    });

    it('still rejects capitalization typos', () => {
      const result = validateEnvironment({
        NODE_ENV: 'Production',
        ZEPHIX_ENV: 'production',
      });
      expect(
        result.errors.some((e) => e.includes('NODE_ENV="Production"')),
      ).toBe(true);
    });
  });

  describe('ZEPHIX_ENV validation', () => {
    it('accepts development, staging, production', () => {
      for (const zephixEnv of ['development', 'staging', 'production']) {
        const env = { NODE_ENV: 'development', ZEPHIX_ENV: zephixEnv };
        const result = validateEnvironment(env);
        expect(
          result.errors.some((e) =>
            e.includes(`ZEPHIX_ENV="${zephixEnv}" is invalid`),
          ),
        ).toBe(false);
      }
    });

    it('errors on unset ZEPHIX_ENV when NODE_ENV=production', () => {
      const env = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgres://u:p@h:5432/d',
        REDIS_URL: 'redis://h:6379',
        JWT_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
        REFRESH_TOKEN_PEPPER: 'c'.repeat(32),
        INTEGRATION_ENCRYPTION_KEY: 'd'.repeat(32),
      };
      const result = validateEnvironment(env);
      expect(
        result.errors.some((e) => e.includes('ZEPHIX_ENV is required')),
      ).toBe(true);
    });

    it('warns (does not error) on unset ZEPHIX_ENV when NODE_ENV=development', () => {
      const result = validateEnvironment({ NODE_ENV: 'development' });
      expect(result.errors.some((e) => e.includes('ZEPHIX_ENV'))).toBe(false);
      expect(
        result.warnings.some((w) => w.includes('ZEPHIX_ENV is not set')),
      ).toBe(true);
    });

    it('treats empty string ZEPHIX_ENV as unset (warns in development)', () => {
      const result = validateEnvironment({
        NODE_ENV: 'development',
        ZEPHIX_ENV: '',
      });
      expect(result.errors.some((e) => e.includes('ZEPHIX_ENV'))).toBe(false);
      expect(
        result.warnings.some((w) => w.includes('ZEPHIX_ENV is not set')),
      ).toBe(true);
    });

    it('silent on unset ZEPHIX_ENV when NODE_ENV=test', () => {
      const result = validateEnvironment({ NODE_ENV: 'test' });
      expect(result.errors.some((e) => e.includes('ZEPHIX_ENV'))).toBe(false);
      expect(result.warnings.some((w) => w.includes('ZEPHIX_ENV'))).toBe(false);
    });

    it('rejects invalid ZEPHIX_ENV value', () => {
      const result = validateEnvironment({
        NODE_ENV: 'development',
        ZEPHIX_ENV: 'banana',
      });
      expect(
        result.errors.some((e) => e.includes('ZEPHIX_ENV="banana" is invalid')),
      ).toBe(true);
    });
  });

  describe('cross-variable consistency', () => {
    it('warns when NODE_ENV=development but ZEPHIX_ENV≠development', () => {
      const result = validateEnvironment({
        NODE_ENV: 'development',
        ZEPHIX_ENV: 'staging',
      });
      expect(result.warnings.some((w) => w.includes('Inconsistent'))).toBe(
        true,
      );
    });

    it('errors on NODE_ENV=production + ZEPHIX_ENV=development', () => {
      const result = validateEnvironment({
        ...validProductionEnv,
        ZEPHIX_ENV: 'development',
      });
      expect(
        result.errors.some((e) => e.includes('Dangerous combination')),
      ).toBe(true);
    });
  });

  describe('production secrets', () => {
    it('passes with all secrets present and ≥32 chars', () => {
      const result = validateEnvironment(validProductionEnv);
      expect(result.errors).toEqual([]);
    });

    it('fails when JWT_SECRET is missing', () => {
      const { JWT_SECRET: _j, ...rest } = validProductionEnv;
      const result = validateEnvironment(rest);
      expect(
        result.errors.some((e) =>
          e.includes('Missing required secret: JWT_SECRET'),
        ),
      ).toBe(true);
    });

    it('fails when JWT_SECRET is too short', () => {
      const result = validateEnvironment({
        ...validProductionEnv,
        JWT_SECRET: 'short',
      });
      expect(
        result.errors.some((e) => e.includes('JWT_SECRET is too short')),
      ).toBe(true);
    });

    it('does not require secrets when NODE_ENV=development', () => {
      const result = validateEnvironment({
        NODE_ENV: 'development',
        ZEPHIX_ENV: 'development',
      });
      expect(
        result.errors.some((e) => e.includes('Missing required secret')),
      ).toBe(false);
    });

    it('validates DATABASE_URL presence (not length — it is a URL)', () => {
      const { DATABASE_URL: _d, ...rest } = validProductionEnv;
      const result = validateEnvironment(rest);
      expect(
        result.errors.some((e) =>
          e.includes('Missing required secret: DATABASE_URL'),
        ),
      ).toBe(true);
    });
  });
});
