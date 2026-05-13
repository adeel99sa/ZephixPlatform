/**
 * Week 2 Stream B — task.* capability resolution (taxonomy §3.4-§3.6 + §4 rows 19-23).
 *
 * Mirrors useEffectiveRole.projectDocumentCapabilities.test.tsx structure.
 * Asserts that the 5 task.* tokens resolve via the workspace-aware §2.4 path,
 * NOT the platform-only `is('paid')` shortcut. Includes the delivery_owner
 * case (taxonomy §5.5) which `useWorkspacePermissions.canEditWork` denies.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEffectiveRole } from "../useEffectiveRole";

const mockUser = vi.fn();
const mockWorkspaceRole = vi.fn<[], string | null>();

vi.mock("@/state/AuthContext", () => ({
  useAuth: () => ({ user: mockUser() }),
}));

vi.mock("@/state/workspace.store", () => ({
  useWorkspaceStore: (selector: (s: { workspaceRole: string | null }) => unknown) =>
    selector({ workspaceRole: mockWorkspaceRole() }),
}));

const TASK_MUTATION_TOKENS = [
  "task.create",
  "task.edit",
  "task.delete",
  "task.assign",
  "task.bulk.update",
] as const;

describe("useEffectiveRole — task.* (§4 rows 19-23, workspace-aware)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("workspace_member: all 5 task mutation tokens ✓; task.view ✓", () => {
    mockUser.mockReturnValue({ id: "u1", platformRole: "MEMBER", role: "member" });
    mockWorkspaceRole.mockReturnValue("workspace_member");
    const { result } = renderHook(() => useEffectiveRole());

    expect(result.current.can("task.view")).toBe(true);
    for (const token of TASK_MUTATION_TOKENS) {
      expect(result.current.can(token)).toBe(true);
    }
  });

  it("workspace_owner: all 5 task mutation tokens ✓", () => {
    mockUser.mockReturnValue({ id: "u1", platformRole: "MEMBER", role: "member" });
    mockWorkspaceRole.mockReturnValue("workspace_owner");
    const { result } = renderHook(() => useEffectiveRole());

    for (const token of TASK_MUTATION_TOKENS) {
      expect(result.current.can(token)).toBe(true);
    }
  });

  it("delivery_owner: task mutation ✓ (§5.5 — fixes canEditWork bug)", () => {
    mockUser.mockReturnValue({ id: "u1", platformRole: "MEMBER", role: "member" });
    mockWorkspaceRole.mockReturnValue("delivery_owner");
    const { result } = renderHook(() => useEffectiveRole());

    // §5.5: delivery_owner collapses to Member column for matrix evaluation.
    // useWorkspacePermissions.canEditWork would return false here — this test
    // documents that the new useEffectiveRole resolution corrects that gap.
    for (const token of TASK_MUTATION_TOKENS) {
      expect(result.current.can(token)).toBe(true);
    }
  });

  it("workspace_viewer: task.view ✓; all 5 mutation tokens ✗", () => {
    mockUser.mockReturnValue({ id: "u1", platformRole: "MEMBER", role: "member" });
    mockWorkspaceRole.mockReturnValue("workspace_viewer");
    const { result } = renderHook(() => useEffectiveRole());

    expect(result.current.can("task.view")).toBe(true);
    for (const token of TASK_MUTATION_TOKENS) {
      expect(result.current.can(token)).toBe(false);
    }
  });

  it("stakeholder: task.view ✓; all 5 mutation tokens ✗ (§5.6)", () => {
    mockUser.mockReturnValue({ id: "u1", platformRole: "MEMBER", role: "member" });
    mockWorkspaceRole.mockReturnValue("stakeholder");
    const { result } = renderHook(() => useEffectiveRole());

    expect(result.current.can("task.view")).toBe(true);
    for (const token of TASK_MUTATION_TOKENS) {
      expect(result.current.can(token)).toBe(false);
    }
  });

  it("Platform VIEWER (any workspace): task.view ✓; all 5 mutation tokens ✗", () => {
    mockUser.mockReturnValue({ id: "u1", platformRole: "VIEWER", role: "viewer" });
    mockWorkspaceRole.mockReturnValue("workspace_member");
    const { result } = renderHook(() => useEffectiveRole());

    expect(result.current.can("task.view")).toBe(true);
    for (const token of TASK_MUTATION_TOKENS) {
      expect(result.current.can(token)).toBe(false);
    }
  });

  it("Platform ADMIN with no workspace_role: ADMIN bypass grants all tokens", () => {
    mockUser.mockReturnValue({ id: "u1", platformRole: "ADMIN", role: "admin" });
    mockWorkspaceRole.mockReturnValue(null);
    const { result } = renderHook(() => useEffectiveRole());

    expect(result.current.can("task.view")).toBe(true);
    for (const token of TASK_MUTATION_TOKENS) {
      expect(result.current.can(token)).toBe(true);
    }
  });

  it("Platform MEMBER with no workspace_role: task.view ✓; mutation tokens ✗", () => {
    // Critical divergence from the old `is('paid')` shortcut. Per §2.4 +
    // §getEffectiveWorkspaceRole, a MEMBER without a membership row has no
    // effective workspace role. Backend would deny task mutations. UI must
    // mirror.
    mockUser.mockReturnValue({ id: "u1", platformRole: "MEMBER", role: "member" });
    mockWorkspaceRole.mockReturnValue(null);
    const { result } = renderHook(() => useEffectiveRole());

    expect(result.current.can("task.view")).toBe(true);
    for (const token of TASK_MUTATION_TOKENS) {
      expect(result.current.can(token)).toBe(false);
    }
  });
});
