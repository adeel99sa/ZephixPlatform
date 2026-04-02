import { describe, it, expect } from "vitest";
import { shouldRunAdminFirstTimeOnboarding } from "./adminOnboardingPolicy";
import { PLATFORM_ROLE } from "@/utils/roles";

describe("shouldRunAdminFirstTimeOnboarding", () => {
  it("is true only for admin with not_started or in_progress", () => {
    expect(
      shouldRunAdminFirstTimeOnboarding({
        platformRole: PLATFORM_ROLE.ADMIN,
        onboardingStatus: "not_started",
      }),
    ).toBe(true);
    expect(
      shouldRunAdminFirstTimeOnboarding({
        platformRole: PLATFORM_ROLE.ADMIN,
        onboardingStatus: "in_progress",
      }),
    ).toBe(true);
  });

  it("is false for completed or dismissed admin", () => {
    expect(
      shouldRunAdminFirstTimeOnboarding({
        platformRole: PLATFORM_ROLE.ADMIN,
        onboardingStatus: "completed",
      }),
    ).toBe(false);
    expect(
      shouldRunAdminFirstTimeOnboarding({
        platformRole: PLATFORM_ROLE.ADMIN,
        onboardingStatus: "dismissed",
      }),
    ).toBe(false);
  });

  it("is false for member, viewer, and undefined status", () => {
    expect(
      shouldRunAdminFirstTimeOnboarding({
        platformRole: PLATFORM_ROLE.MEMBER,
        onboardingStatus: "not_started",
      }),
    ).toBe(false);
    expect(
      shouldRunAdminFirstTimeOnboarding({
        platformRole: PLATFORM_ROLE.VIEWER,
        onboardingStatus: "not_started",
      }),
    ).toBe(false);
    expect(
      shouldRunAdminFirstTimeOnboarding({
        platformRole: PLATFORM_ROLE.ADMIN,
        onboardingStatus: undefined,
      }),
    ).toBe(false);
  });
});
