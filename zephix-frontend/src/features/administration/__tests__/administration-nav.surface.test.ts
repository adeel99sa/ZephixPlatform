import { describe, expect, it } from "vitest";
import { ADMINISTRATION_NAV_SECTIONS } from "@/features/administration/constants";

describe("Administration nav surface", () => {
  it("keeps only source-backed core sections in left nav", () => {
    const labels = ADMINISTRATION_NAV_SECTIONS.flatMap((section) =>
      section.items.map((item) => item.label),
    );
    expect(labels).toEqual([
      "Overview",
      "Organization",
      "Users",
      "Teams",
      "Access Control",
      "Audit Logs",
      "AI Governance",
      "Security",
      "Integrations",
      "Data Management",
      "Billing",
    ]);
    expect(labels).not.toContain("Template Center");
    expect(labels).not.toContain("Templates");
  });
});

