import { AuditAction, AuditEntityType } from '../../audit/audit.constants';

/**
 * SEC-3 — RedisAuthRateLimitStore unit tests.
 * Covers the core new logic: fixed-window INCR/EXPIRE, read-only peek, and
 * Ruling A (fail-open-loud): on Redis error the store allows the request AND
 * writes a degradation receipt once, then a recovery receipt on the next
 * success. Login-entry 429 enforcement is proven live in Stage-2.
 */

const mockMulti = {
  get: jest.fn().mockReturnThis(),
  ttl: jest.fn().mockReturnThis(),
  exec: jest.fn(),
};
const mockRedis = {
  incr: jest.fn(),
  expire: jest.fn(),
  multi: jest.fn(() => mockMulti),
  on: jest.fn(),
  quit: jest.fn().mockResolvedValue('OK'),
};

jest.mock('ioredis', () => jest.fn().mockImplementation(() => mockRedis));

// Imported after the mock is registered.
import { RedisAuthRateLimitStore } from './redis-auth-rate-limit-store';

describe('RedisAuthRateLimitStore (SEC-3)', () => {
  let audit: { record: jest.Mock };
  let store: RedisAuthRateLimitStore;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.multi.mockReturnValue(mockMulti);
    mockMulti.get.mockReturnThis();
    mockMulti.ttl.mockReturnThis();
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    store = new RedisAuthRateLimitStore('redis://localhost:6379', audit);
    jest.spyOn((store as any).logger, 'error').mockImplementation(() => {});
    jest.spyOn((store as any).logger, 'log').mockImplementation(() => {});
  });

  describe('hit() — fixed window', () => {
    it('sets EXPIRE only on the first hit of a window and reports allowed', async () => {
      mockRedis.incr.mockResolvedValueOnce(1);
      const r = await store.hit('auth:fail:abc', 900, 10);
      expect(mockRedis.incr).toHaveBeenCalledWith('auth:fail:abc');
      expect(mockRedis.expire).toHaveBeenCalledWith('auth:fail:abc', 900);
      expect(r).toEqual({ allowed: true, remaining: 9 });
    });

    it('does NOT reset EXPIRE on subsequent hits', async () => {
      mockRedis.incr.mockResolvedValueOnce(5);
      const r = await store.hit('auth:fail:abc', 900, 10);
      expect(mockRedis.expire).not.toHaveBeenCalled();
      expect(r).toEqual({ allowed: true, remaining: 5 });
    });

    it('reports NOT allowed once the count exceeds the limit', async () => {
      mockRedis.incr.mockResolvedValueOnce(11);
      const r = await store.hit('auth:fail:abc', 900, 10);
      expect(r.allowed).toBe(false);
      expect(r.remaining).toBe(0);
    });
  });

  describe('peek() — read-only', () => {
    it('reads GET + TTL without incrementing', async () => {
      mockMulti.exec.mockResolvedValueOnce([
        [null, '7'],
        [null, 512],
      ]);
      const s = await store.peek('auth:fail:abc');
      expect(mockRedis.incr).not.toHaveBeenCalled();
      expect(s).toEqual({ count: 7, ttlSeconds: 512 });
    });

    it('returns count 0 for an absent key', async () => {
      mockMulti.exec.mockResolvedValueOnce([
        [null, null],
        [null, -2],
      ]);
      const s = await store.peek('auth:fail:missing');
      expect(s).toEqual({ count: 0, ttlSeconds: 0 });
    });
  });

  describe('Ruling A — fail-open-loud', () => {
    it('hit() fails OPEN when Redis throws', async () => {
      mockRedis.incr.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      const r = await store.hit('auth:fail:abc', 900, 10);
      expect(r.allowed).toBe(true);
    });

    it('peek() fails OPEN (count 0 = no throttle) when Redis throws', async () => {
      mockMulti.exec.mockRejectedValueOnce(new Error('ETIMEDOUT'));
      const s = await store.peek('auth:fail:abc');
      expect(s).toEqual({ count: 0, ttlSeconds: 0 });
    });

    it('writes ONE degradation receipt on the failure transition, not per request', async () => {
      mockRedis.incr.mockRejectedValue(new Error('down'));
      await store.hit('auth:fail:abc', 900, 10);
      await store.hit('auth:fail:abc', 900, 10);
      const degraded = audit.record.mock.calls.filter(
        (c) => c[0].action === AuditAction.AUTH_RATE_LIMIT_DEGRADED,
      );
      expect(degraded).toHaveLength(1);
      expect(degraded[0][0]).toMatchObject({
        entityType: AuditEntityType.SECURITY,
        actorUserId: '00000000-0000-0000-0000-000000000000',
        organizationId: '00000000-0000-0000-0000-000000000000',
      });
    });

    it('writes a recovery receipt when Redis succeeds after degradation', async () => {
      mockRedis.incr.mockRejectedValueOnce(new Error('down'));
      await store.hit('auth:fail:abc', 900, 10); // degrade
      mockRedis.incr.mockResolvedValueOnce(1);
      await store.hit('auth:fail:abc', 900, 10); // recover
      const recovered = audit.record.mock.calls.filter(
        (c) => c[0].action === AuditAction.AUTH_RATE_LIMIT_RECOVERED,
      );
      expect(recovered).toHaveLength(1);
    });

    it('never lets an audit-write failure break the auth path', async () => {
      mockRedis.incr.mockRejectedValueOnce(new Error('down'));
      audit.record.mockRejectedValueOnce(new Error('audit db down'));
      await expect(store.hit('auth:fail:abc', 900, 10)).resolves.toEqual({
        allowed: true,
        remaining: Number.MAX_SAFE_INTEGER,
      });
    });
  });
});
