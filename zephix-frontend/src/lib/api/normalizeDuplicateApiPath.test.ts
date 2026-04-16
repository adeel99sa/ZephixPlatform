import { describe, expect, it } from "vitest";

import { normalizeDuplicateApiPath } from "./normalizeDuplicateApiPath";

describe("normalizeDuplicateApiPath", () => {
  it("strips a leading /api when baseURL already ends with /api", () => {
    expect(
      normalizeDuplicateApiPath("/api/dashboards/published/workspace/ws1", "https://host/api"),
    ).toBe("/dashboards/published/workspace/ws1");
  });

  it("leaves /auth paths when base ends with /api", () => {
    expect(normalizeDuplicateApiPath("/auth/me", "https://host/api")).toBe("/auth/me");
  });

  it("does not strip when base has no /api suffix", () => {
    expect(normalizeDuplicateApiPath("/api/foo", "https://host")).toBe("/api/foo");
  });

  it("maps bare /api to /", () => {
    expect(normalizeDuplicateApiPath("/api", "https://host/api")).toBe("/");
  });
});
