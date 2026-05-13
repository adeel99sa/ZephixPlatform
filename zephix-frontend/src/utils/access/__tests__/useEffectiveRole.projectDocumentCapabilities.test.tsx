/**
 * Week 2 — project.* and document.* capability resolution (taxonomy §2.4, §4).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEffectiveRole, effectiveWorkspaceUiColumns } from "../useEffectiveRole";

const mockUser = vi.fn();
const mockWorkspaceRole = vi.fn<[], string | null>();

vi.mock("@/state/AuthContext", () => ({
  useAuth: () => ({ user: mockUser() }),
}));

vi.mock("@/state/workspace.store", () => ({
  useWorkspaceStore: (selector: (s: { workspaceRole: string | null }) => unknown) =>
    selector({ workspaceRole: mockWorkspaceRole() }),
}));

describe("useEffectiveRole — project.* / document.* (§4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.mockReturnValue({
      id: "u1",
      platformRole: "MEMBER",
      role: "member",
    });
    mockWorkspaceRole.mockReturnValue("workspace_member");
  });

  it("Member column: project.edit and document.edit/create true; document.delete false", () => {
    const { result } = renderHook(() => useEffectiveRole());
    expect(result.current.can("project.edit")).toBe(true);
    expect(result.current.can("project.manage.team")).toBe(true);
    expect(result.current.can("project.archive")).toBe(false);
    expect(result.current.can("project.delete")).toBe(false);
    expect(result.current.can("document.create")).toBe(true);
    expect(result.current.can("document.edit")).toBe(true);
    expect(result.current.can("document.delete")).toBe(false);
  });

  it("workspace_owner: project.archive/delete and document.delete true", () => {
    mockWorkspaceRole.mockReturnValue("workspace_owner");
    const { result } = renderHook(() => useEffectiveRole());
    expect(result.current.can("project.archive")).toBe(true);
    expect(result.current.can("project.delete")).toBe(true);
    expect(result.current.can("document.delete")).toBe(true);
  });

  it("workspace_viewer: read-only project and documents", () => {
    mockWorkspaceRole.mockReturnValue("workspace_viewer");
    const { result } = renderHook(() => useEffectiveRole());
    expect(result.current.can("project.view")).toBe(true);
    expect(result.current.can("document.view")).toBe(true);
    expect(result.current.can("project.edit")).toBe(false);
    expect(result.current.can("document.create")).toBe(false);
    expect(result.current.can("document.edit")).toBe(false);
    expect(result.current.can("document.delete")).toBe(false);
  });

  it("Platform ADMIN with workspace_member still gets Admin column (bypass)", () => {
    mockUser.mockReturnValue({
      id: "u1",
      platformRole: "ADMIN",
      role: "admin",
    });
    mockWorkspaceRole.mockReturnValue("workspace_member");
    const { result } = renderHook(() => useEffectiveRole());
    expect(result.current.can("document.delete")).toBe(true);
    expect(result.current.can("project.archive")).toBe(true);
  });
});

describe("effectiveWorkspaceUiColumns export", () => {
  it("maps stakeholder to viewer column", () => {
    const cols = effectiveWorkspaceUiColumns(
      { platformRole: "MEMBER" },
      "stakeholder",
    );
    expect(cols.admin).toBe(false);
    expect(cols.member).toBe(false);
    expect(cols.viewer).toBe(true);
  });
});
