import { describe, it, expect } from "vitest";
import { render, screen } from "../../../test/utils";
import { LandingNavbar } from "../LandingNavbar";

describe("LandingNavbar (V3)", () => {
  it("renders brand, enterprise nav labels, and CTAs", () => {
    render(<LandingNavbar />);

    expect(screen.getByRole("link", { name: /zephix home/i })).toBeInTheDocument();
    expect(screen.getByText("Zephix")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /platform/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /solutions/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resources/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pricing/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^log in$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /contact sales/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /request demo/i })).toBeInTheDocument();
  });

  it("uses main navigation landmark", () => {
    render(<LandingNavbar />);
    expect(screen.getByRole("navigation", { name: /main navigation/i })).toBeInTheDocument();
  });
});
