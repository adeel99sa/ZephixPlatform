import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("isStagingMarketingLandingEnabled", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is false when VITE_STAGING_MARKETING_LANDING is unset", async () => {
    vi.stubEnv("VITE_STAGING_MARKETING_LANDING", "");
    const { isStagingMarketingLandingEnabled } = await import("../flags");
    expect(isStagingMarketingLandingEnabled()).toBe(false);
  });

  it("is true when VITE_STAGING_MARKETING_LANDING is true", async () => {
    vi.stubEnv("VITE_STAGING_MARKETING_LANDING", "true");
    const { isStagingMarketingLandingEnabled } = await import("../flags");
    expect(isStagingMarketingLandingEnabled()).toBe(true);
  });

  it("is true when VITE_STAGING_MARKETING_LANDING is 1", async () => {
    vi.stubEnv("VITE_STAGING_MARKETING_LANDING", "1");
    const { isStagingMarketingLandingEnabled } = await import("../flags");
    expect(isStagingMarketingLandingEnabled()).toBe(true);
  });
});
