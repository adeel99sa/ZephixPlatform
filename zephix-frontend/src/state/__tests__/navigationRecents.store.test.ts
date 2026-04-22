import { describe, it, expect, beforeEach } from "vitest";

import { parseFavoritableRecent } from "@/state/navigationRecents.store";

describe("parseFavoritableRecent", () => {
  beforeEach(() => {
    document.title = "";
  });

  const uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  it("returns workspace for /workspaces/:id/home", () => {
    const r = parseFavoritableRecent(`/workspaces/${uuid}/home`);
    expect(r).toEqual({
      itemType: "workspace",
      itemId: uuid,
      path: `/workspaces/${uuid}/home`,
    });
  });

  it("returns workspace for /workspaces/:id", () => {
    const r = parseFavoritableRecent(`/workspaces/${uuid}`);
    expect(r?.itemType).toBe("workspace");
    expect(r?.itemId).toBe(uuid);
  });

  it("returns project for /projects/:id", () => {
    const r = parseFavoritableRecent(`/projects/${uuid}/plan`);
    expect(r?.itemType).toBe("project");
    expect(r?.itemId).toBe(uuid);
  });

  it("returns dashboard for /dashboards/:id", () => {
    const r = parseFavoritableRecent(`/dashboards/${uuid}`);
    expect(r?.itemType).toBe("dashboard");
    expect(r?.itemId).toBe(uuid);
  });

  it("returns null for inbox", () => {
    expect(parseFavoritableRecent("/inbox")).toBeNull();
  });
});
