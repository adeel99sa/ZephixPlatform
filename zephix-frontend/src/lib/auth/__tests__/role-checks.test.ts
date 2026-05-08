import { describe, expect, it } from "vitest";

import { canUseAdministrationPeopleUi, userMeetsMinOrgRole } from "../role-checks";

describe("role-checks", () => {
  it("requires admin for administration people UI", () => {
    expect(canUseAdministrationPeopleUi({ platformRole: "ADMIN" })).toBe(true);
    expect(canUseAdministrationPeopleUi({ platformRole: "MEMBER" })).toBe(false);
    expect(canUseAdministrationPeopleUi({ platformRole: "VIEWER" })).toBe(false);
  });

  it("evaluates minimum org role thresholds", () => {
    expect(userMeetsMinOrgRole({ platformRole: "VIEWER" }, "viewer")).toBe(true);
    expect(userMeetsMinOrgRole({ platformRole: "VIEWER" }, "member")).toBe(false);
    expect(userMeetsMinOrgRole({ platformRole: "MEMBER" }, "member")).toBe(true);
    expect(userMeetsMinOrgRole({ platformRole: "MEMBER" }, "admin")).toBe(false);
    expect(userMeetsMinOrgRole({ platformRole: "ADMIN" }, "admin")).toBe(true);
  });
});
