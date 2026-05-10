import { describe, it, expect, vi, afterEach } from 'vitest';

describe('isB2TenancyV2Enabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is false when VITE_B2_TENANCY_V2_ENABLED is unset', async () => {
    vi.stubEnv('VITE_B2_TENANCY_V2_ENABLED', '');
    vi.resetModules();
    const { isB2TenancyV2Enabled } = await import('../flags');
    expect(isB2TenancyV2Enabled()).toBe(false);
  });

  it('is true when VITE_B2_TENANCY_V2_ENABLED is 1', async () => {
    vi.stubEnv('VITE_B2_TENANCY_V2_ENABLED', '1');
    vi.resetModules();
    const { isB2TenancyV2Enabled } = await import('../flags');
    expect(isB2TenancyV2Enabled()).toBe(true);
  });
});
