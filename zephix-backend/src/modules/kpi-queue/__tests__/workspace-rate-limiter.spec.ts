import { WorkspaceRateLimiter } from '../services/workspace-rate-limiter';

describe('WorkspaceRateLimiter', () => {
  it('allows initial burst', () => {
    const limiter = new WorkspaceRateLimiter(2, 10);

    for (let i = 0; i < 10; i++) {
      expect(limiter.tryConsume('ws-1')).toBe(true);
    }
  });

  it('blocks after burst exhausted', () => {
    const limiter = new WorkspaceRateLimiter(2, 5);

    for (let i = 0; i < 5; i++) {
      limiter.tryConsume('ws-1');
    }

    expect(limiter.tryConsume('ws-1')).toBe(false);
  });

  it('isolates workspaces', () => {
    const limiter = new WorkspaceRateLimiter(2, 3);

    for (let i = 0; i < 3; i++) {
      limiter.tryConsume('ws-1');
    }

    // ws-2 should still have full burst
    expect(limiter.tryConsume('ws-2')).toBe(true);
    // ws-1 should be blocked
    expect(limiter.tryConsume('ws-1')).toBe(false);
  });

  it('prunes stale buckets', () => {
    const limiter = new WorkspaceRateLimiter(2, 5);
    limiter.tryConsume('ws-1');

    // Prune with 0 maxAge cleans everything
    limiter.pruneStale(0);

    // After prune, bucket is gone — new request creates fresh bucket
    expect(limiter.tryConsume('ws-1')).toBe(true);
  });
});
