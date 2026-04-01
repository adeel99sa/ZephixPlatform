import { describe, it, expect } from "vitest";
import { shouldUseFullPageOnboarding } from "./onboarding-route-policy";

describe("shouldUseFullPageOnboarding", () => {
  const base = {
    platformRole: "ADMIN" as const,
    onboardingStatus: "not_started" as const,
    completed: false,
    dismissed: false,
    hasAccessibleWorkspace: false,
  };

  it("returns true only for admin bootstrap", () => {
    expect(shouldUseFullPageOnboarding(base)).toBe(true);
  });

  it("returns false for MEMBER", () => {
    expect(shouldUseFullPageOnboarding({ ...base, platformRole: "MEMBER" })).toBe(false);
  });

  it("returns false when completed or dismissed", () => {
    expect(shouldUseFullPageOnboarding({ ...base, completed: true })).toBe(false);
    expect(shouldUseFullPageOnboarding({ ...base, dismissed: true })).toBe(false);
    expect(shouldUseFullPageOnboarding({ ...base, onboardingStatus: "completed" })).toBe(false);
    expect(shouldUseFullPageOnboarding({ ...base, onboardingStatus: "dismissed" })).toBe(false);
  });

  it("returns false when user has workspaces", () => {
    expect(shouldUseFullPageOnboarding({ ...base, hasAccessibleWorkspace: true })).toBe(false);
  });

  it("returns false for ineligible status values", () => {
    expect(shouldUseFullPageOnboarding({ ...base, onboardingStatus: undefined })).toBe(false);
  });
});
