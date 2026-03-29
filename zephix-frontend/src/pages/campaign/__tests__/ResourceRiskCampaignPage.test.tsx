import { describe, it, expect } from "vitest";
import { within } from "@testing-library/react";
import { render, screen } from "../../../test/utils";
import ResourceRiskCampaignPage from "../ResourceRiskCampaignPage";

describe("ResourceRiskCampaignPage", () => {
  it("renders problem-first headline, demo route CTAs, governance bridge, and preview hierarchy (public campaign surface)", () => {
    render(<ResourceRiskCampaignPage />);

    expect(
      screen.getByRole("heading", { name: /See Every Conflict Before It Cascades/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Powered by a system that connects resources, dependencies, and governance/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Resource conflict/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Gate blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/Dependency chain/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /This only works because governance is built into execution/i,
      }),
    ).toBeInTheDocument();

    const main = screen.getByRole("main");
    const demoLinks = within(main).getAllByRole("link", { name: /Request Demo/i });
    expect(demoLinks.length).toBeGreaterThanOrEqual(1);
    for (const link of demoLinks) {
      expect(link.getAttribute("href")).toMatch(/\/demo/);
      expect(link.getAttribute("href")).not.toMatch(/^mailto:/);
      expect(link.getAttribute("data-cta")).toBe("demo-request");
    }

    expect(main.querySelector('a[href^="mailto:"]')).toBeNull();
  });
});
