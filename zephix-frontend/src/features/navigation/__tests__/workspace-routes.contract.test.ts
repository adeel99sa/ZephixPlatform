import { describe, expect, it } from "vitest";
import { getWorkspaceDashboardRoute } from "../workspace-routes";

describe("workspace route contract", () => {
  it("workspace click route resolves to workspace dashboard", () => {
    expect(getWorkspaceDashboardRoute("ws-123")).toBe(
      "/workspaces/ws-123/dashboard",
    );
  });
});

