import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/state/workspace.store", () => ({
  useWorkspaceStore: {
    getState: vi.fn(() => ({ activeWorkspaceId: "ws-active" })),
  },
}));

import { createDashboard } from "../api";

import { api } from "@/lib/api";

describe("dashboards api contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates dashboards under the explicit workspace route", async () => {
    (api.post as any).mockResolvedValue({
      id: "2a99f0f2-1c21-48f8-a4d7-532f10a07d71",
      name: "Ops Dashboard",
      visibility: "WORKSPACE",
      workspaceId: "eeb8b460-5f4a-4725-8664-bce758d7fc52",
      widgets: [],
      layoutConfig: {
        version: 1,
        grid: { columns: 12, rowHeight: 32 },
        widgets: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await createDashboard(
      {
        name: "Ops Dashboard",
        visibility: "WORKSPACE",
        layoutConfig: {
          version: 1,
          grid: { columns: 12, rowHeight: 32 },
          widgets: [],
        },
      },
      "eeb8b460-5f4a-4725-8664-bce758d7fc52",
    );

    expect(api.post).toHaveBeenCalledWith(
      "/workspaces/eeb8b460-5f4a-4725-8664-bce758d7fc52/dashboards",
      expect.objectContaining({
        layoutConfig: expect.objectContaining({
          version: 1,
        }),
      }),
      expect.any(Object),
    );
  });

  it("rejects non-versioned dashboard layout payloads", async () => {
    await expect(
      createDashboard(
        {
          name: "Invalid",
          visibility: "WORKSPACE",
          layoutConfig: { widgets: [] } as unknown as never,
        },
        "eeb8b460-5f4a-4725-8664-bce758d7fc52",
      ),
    ).rejects.toThrow();
  });
});
