import {
  ForbiddenException,
  ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WorkspaceMembershipFeatureGuard } from './feature-flag.guard';

describe('WorkspaceMembershipFeatureGuard', () => {
  function makeGuard(env: Record<string, string | undefined>) {
    const configService = {
      get: (key: string, defaultValue?: string) => env[key] ?? defaultValue,
    } as unknown as ConfigService;
    return new WorkspaceMembershipFeatureGuard(configService);
  }

  const mockContext = {} as ExecutionContext;

  describe('bypass conditions', () => {
    it('bypasses when NODE_ENV=development', () => {
      const guard = makeGuard({
        NODE_ENV: 'development',
        ZEPHIX_WS_MEMBERSHIP_V1: '0',
      });
      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('bypasses when NODE_ENV=test', () => {
      const guard = makeGuard({
        NODE_ENV: 'test',
        ZEPHIX_WS_MEMBERSHIP_V1: '0',
      });
      expect(guard.canActivate(mockContext)).toBe(true);
    });
  });

  describe('enforcement in production mode (staging or real prod)', () => {
    it('allows when flag=1 and NODE_ENV=production + ZEPHIX_ENV=staging', () => {
      const guard = makeGuard({
        NODE_ENV: 'production',
        ZEPHIX_ENV: 'staging',
        ZEPHIX_WS_MEMBERSHIP_V1: '1',
      });
      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('allows when flag=1 and NODE_ENV=production + ZEPHIX_ENV=production', () => {
      const guard = makeGuard({
        NODE_ENV: 'production',
        ZEPHIX_ENV: 'production',
        ZEPHIX_WS_MEMBERSHIP_V1: '1',
      });
      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('blocks when flag=0 and NODE_ENV=production', () => {
      const guard = makeGuard({
        NODE_ENV: 'production',
        ZEPHIX_ENV: 'staging',
        ZEPHIX_WS_MEMBERSHIP_V1: '0',
      });
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('blocks when flag is unset and NODE_ENV=production', () => {
      const guard = makeGuard({
        NODE_ENV: 'production',
        ZEPHIX_ENV: 'production',
      });
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('allows when NODE_ENV is unset and flag=1 (defaults NODE_ENV to production)', () => {
      const guard = makeGuard({
        ZEPHIX_WS_MEMBERSHIP_V1: '1',
      });
      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('blocks when NODE_ENV unset and flag unset (defaults to production, flag off)', () => {
      const guard = makeGuard({});
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });

  describe('error payload shape', () => {
    it('throws structured ForbiddenException', () => {
      const guard = makeGuard({
        NODE_ENV: 'production',
        ZEPHIX_WS_MEMBERSHIP_V1: '0',
      });
      try {
        guard.canActivate(mockContext);
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
        const response = (err as ForbiddenException).getResponse() as {
          code?: string;
          feature?: string;
          message?: string;
        };
        expect(response.code).toBe('FEATURE_DISABLED');
        expect(response.feature).toBe('workspace_membership_v1');
        expect(response.message).toBeDefined();
      }
    });
  });
});
