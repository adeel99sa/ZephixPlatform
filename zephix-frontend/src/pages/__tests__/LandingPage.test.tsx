import { describe, it, expect } from "vitest";
import { render, screen } from "../../test/utils";
import LandingPage from "../LandingPage";

describe("LandingPage V3", () => {
  it("renders governance-first hero and engines without fake metrics", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", {
        name: /The Operating System for Enterprise Project Delivery/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Gate 2: Design Review/i)).toBeInTheDocument();
    expect(screen.getByText(/Resource conflict: Sarah J/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Built on Five Native Engines/i }),
    ).toBeInTheDocument();
    const engines = document.getElementById("engines");
    expect(engines?.querySelector("h3")?.textContent).toMatch(/^Governance Engine$/);
    expect(screen.queryByText(/trusted by \d+/i)).not.toBeInTheDocument();
  });
});
