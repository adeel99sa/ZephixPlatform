import { describe, expect, it } from "vitest";
import { ADMINISTRATION_NAV_SECTIONS } from "@/features/administration/constants";

describe("administration nav contract", () => {
  it("matches the exact locked section and item order", () => {
    expect(ADMINISTRATION_NAV_SECTIONS.map((section) => section.label)).toEqual([
      "Overview",
      "Organization",
      "Governance",
      "Security",
      "Finance",
    ]);

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
  });

  it("fails if any extra item appears", () => {
    const labels = ADMINISTRATION_NAV_SECTIONS.flatMap((section) =>
      section.items.map((item) => item.label.toLowerCase()),
    );

    expect(labels).toHaveLength(11);
    expect(labels).not.toContain("workspaces");
    expect(labels).not.toContain("projects");
    expect(labels).not.toContain("tasks");
    expect(labels).not.toContain("members");
    expect(labels).not.toContain("permissions");
    expect(labels).not.toContain("templates");
    expect(labels).not.toContain("ai usage");
    expect(labels).not.toContain("automations");
    expect(labels).not.toContain("custom fields");
  });
});
