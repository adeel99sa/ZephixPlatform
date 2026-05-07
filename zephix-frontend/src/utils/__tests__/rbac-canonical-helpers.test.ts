import { describe, expect, it } from "vitest";

import { isPlatformAdmin, isPlatformMember, isPlatformViewer, isWorkspaceOwner } from "@/utils/access";
import { platformRoleFromUser } from "@/utils/roles";

describe("RBAC canonical helper behavior", () => {
  it("resolves platform role from platformRole first, then legacy role", () => {
    expect(platformRoleFromUser({ platformRole: "ADMIN", role: "member" })).toBe("ADMIN");
    expect(platformRoleFromUser({ role: "member" })).toBe("MEMBER");
    expect(platformRoleFromUser({ role: "viewer" })).toBe("VIEWER");
  });

  it("evaluates platform admin/member/viewer through canonical access helpers", () => {
    expect(isPlatformAdmin({ platformRole: "ADMIN" })).toBe(true);
    expect(isPlatformAdmin({ role: "admin" })).toBe(true);
    expect(isPlatformAdmin({ permissions: { isAdmin: true } })).toBe(true);
    expect(isPlatformAdmin({ platformRole: "MEMBER" })).toBe(false);

    expect(isPlatformMember({ platformRole: "MEMBER" })).toBe(true);
    expect(isPlatformViewer({ platformRole: "VIEWER" })).toBe(true);
  });

  it("evaluates workspace-owner checks through canonical helper", () => {
    expect(isWorkspaceOwner("workspace_owner")).toBe(true);
    expect(isWorkspaceOwner("workspace_member")).toBe(false);
    expect(isWorkspaceOwner(null)).toBe(false);
  });
});
