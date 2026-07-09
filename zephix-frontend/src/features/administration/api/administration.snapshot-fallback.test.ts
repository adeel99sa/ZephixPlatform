import { describe, it, expect, vi, beforeEach } from "vitest";

const requestGet = vi.fn();

vi.mock("@/lib/api", () => ({
  request: {
    get: (...args: unknown[]) => requestGet(...args),
  },
}));

import { administrationApi } from "./administration.api";

describe("administrationApi.getWorkspaceSnapshot fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to listWorkspaces when snapshot returns empty", async () => {
    requestGet.mockImplementation(async (path: string) => {
      if (path.startsWith("/admin/workspaces/snapshot")) {
        return { data: [] };
      }
      if (path === "/admin/workspaces") {
        return {
          data: [
            {
              id: "ws-1",
              name: "GovProofFinal",
              owner: { id: "u-1", email: "a@x.dev", name: "Admin" },
              status: "active",
            },
          ],
        };
      }
      throw new Error(`unexpected path ${path}`);
    });

    const { data } = await administrationApi.getWorkspaceSnapshot({ page: 1, limit: 20 });

    expect(data).toHaveLength(1);
    expect(data[0]?.workspaceId).toBe("ws-1");
    expect(data[0]?.workspaceName).toBe("GovProofFinal");
    expect(requestGet).toHaveBeenCalledWith("/admin/workspaces/snapshot?page=1&limit=20");
    expect(requestGet).toHaveBeenCalledWith("/admin/workspaces");
  });
});
