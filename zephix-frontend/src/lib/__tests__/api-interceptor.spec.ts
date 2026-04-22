import { describe, it, expect } from 'vitest';
import { isAuthRefreshBypassUrl } from '../api';

describe('auth refresh interceptor helpers', () => {
  it('does not attempt refresh for login, register, csrf, refresh, or logout URLs', () => {
    expect(isAuthRefreshBypassUrl('/auth/login')).toBe(true);
    expect(isAuthRefreshBypassUrl('/api/auth/register')).toBe(true);
    expect(isAuthRefreshBypassUrl('/auth/signup')).toBe(true);
    expect(isAuthRefreshBypassUrl('/auth/csrf')).toBe(true);
    expect(isAuthRefreshBypassUrl('/auth/refresh')).toBe(true);
    expect(isAuthRefreshBypassUrl('/auth/logout')).toBe(true);
  });

  it('allows refresh for normal API paths', () => {
    expect(isAuthRefreshBypassUrl('/work/tasks')).toBe(false);
    expect(isAuthRefreshBypassUrl('/projects/p1')).toBe(false);
    expect(isAuthRefreshBypassUrl('/my-work')).toBe(false);
  });
});
