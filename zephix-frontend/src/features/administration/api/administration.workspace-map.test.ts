import { describe, it, expect } from "vitest";
import { mapAdminWorkspaceListItemToSnapshotRow } from "./administration.api";

describe("mapAdminWorkspaceListItemToSnapshotRow", () => {
  it("maps id/name/owner to WorkspaceSnapshotRow", () => {
    const row = mapAdminWorkspaceListItemToSnapshotRow({
      id: "ws-1",
      name: "Cloud Team",
      owner: { id: "u-1", email: "a@x.dev", name: "Admin One" },
      status: "active",
    });
    expect(row.workspaceId).toBe("ws-1");
    expect(row.workspaceName).toBe("Cloud Team");
    expect(row.owners).toEqual([
      { userId: "u-1", name: "Admin One", email: "a@x.dev" },
    ]);
    expect(row.status).toBe("ACTIVE");
    expect(row.projectCount).toBe(0);
    expect(row.openExceptions).toBe(0);
    expect(row.budgetStatus).toBe("UNKNOWN");
  });

  it("marks archived status", () => {
    const row = mapAdminWorkspaceListItemToSnapshotRow({
      id: "ws-2",
      name: "Old",
      status: "archived",
    });
    expect(row.status).toBe("ARCHIVED");
    expect(row.owners).toEqual([]);
  });
});
