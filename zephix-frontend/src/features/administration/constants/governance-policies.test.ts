import { describe, expect, it } from "vitest";

import { resolveMethodologyKey } from "./governance-policies";

describe("resolveMethodologyKey", () => {
  it("maps explicit methodology enums regardless of case", () => {
    expect(resolveMethodologyKey({ methodology: "WATERFALL" })).toBe("waterfall");
    expect(resolveMethodologyKey({ methodology: "Hybrid" })).toBe("hybrid");
  });

  it("uses first segment of hyphenated methodology", () => {
    expect(resolveMethodologyKey({ methodology: "WATERFALL_PHASED" })).toBe("waterfall");
  });

  it("maps deliveryMethod slugs with version suffixes (underscore or hyphen)", () => {
    expect(resolveMethodologyKey({ deliveryMethod: "waterfall_v1" })).toBe("waterfall");
    expect(resolveMethodologyKey({ deliveryMethod: "SCRUM_V2" })).toBe("scrum");
  });

  it("maps predictive/traditional synonyms to waterfall", () => {
    expect(resolveMethodologyKey({ methodology: "PREDICTIVE" })).toBe("waterfall");
    expect(resolveMethodologyKey({ methodology: "Traditional" })).toBe("waterfall");
  });

  it("returns empty when neither field is set", () => {
    expect(resolveMethodologyKey({})).toBe("");
  });

  it("returns custom for unknown tokens", () => {
    expect(resolveMethodologyKey({ methodology: "LEAN" })).toBe("custom");
  });
});
