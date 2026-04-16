import { describe, expect, it } from "vitest";

import { resolveApiBaseUrl } from "./resolveApiBaseUrl";

describe("resolveApiBaseUrl", () => {
  it("keeps explicit /api path", () => {
    expect(
      resolveApiBaseUrl(
        "https://zephix-backend-staging-staging.up.railway.app/api",
        "https://fallback/api",
      ),
    ).toBe("https://zephix-backend-staging-staging.up.railway.app/api");
  });

  it("appends /api to absolute host URL without path", () => {
    expect(
      resolveApiBaseUrl(
        "https://zephix-backend-staging-staging.up.railway.app",
        "https://fallback/api",
      ),
    ).toBe("https://zephix-backend-staging-staging.up.railway.app/api");
  });

  it("uses fallback when env is empty", () => {
    expect(resolveApiBaseUrl("", "https://fallback/api")).toBe("https://fallback/api");
  });
});
