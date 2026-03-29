import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdministrationSecurityPage from "@/features/administration/pages/AdministrationSecurityPage";

vi.mock("@/lib/api", () => ({
  request: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/features/administration/api/administration.api", () => ({
  administrationApi: {
    getSystemHealth: vi.fn().mockResolvedValue({ status: "ok", database: "ok" }),
  },
}));

describe("administration security page truth contract", () => {
  it("renders authentication/session/policy sections with source-backed posture", async () => {
    render(
      <MemoryRouter>
        <AdministrationSecurityPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Security" })).toBeInTheDocument(),
    );
    expect(screen.getByText("Authentication")).toBeInTheDocument();
    expect(screen.getByText("Session controls")).toBeInTheDocument();
    expect(screen.getByText("Security policies")).toBeInTheDocument();
  });
});
