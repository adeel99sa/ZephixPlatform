import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DashboardSwitcher } from "@/components/dashboards/DashboardSwitcher";

const useDashboardsMock = vi.fn();
const trackMock = vi.fn();

vi.mock("@/features/dashboards/useDashboards", () => ({
  useDashboards: (...args: unknown[]) => useDashboardsMock(...args),
}));

vi.mock("@/lib/telemetry", () => ({
  track: (...args: unknown[]) => trackMock(...args),
}));

describe("DashboardSwitcher verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows explicit error state and retry action when dashboards fail", () => {
    const retry = vi.fn();
    useDashboardsMock.mockReturnValue({
      items: [],
      loading: false,
      error: "Network unavailable",
      retry,
    });

    render(
      <MemoryRouter>
        <DashboardSwitcher workspaceId="ws-1" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dashboards ▾" }));

    expect(screen.getByTestId("dashboard-switcher-error")).toBeInTheDocument();
    expect(screen.queryByText("No dashboards found")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("dashboard-switcher-retry"));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("shows empty state only when no data and no error", () => {
    useDashboardsMock.mockReturnValue({
      items: [],
      loading: false,
      error: null,
      retry: vi.fn(),
    });

    render(
      <MemoryRouter>
        <DashboardSwitcher workspaceId="ws-1" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dashboards ▾" }));
    expect(screen.getByText("No dashboards found")).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-switcher-error")).not.toBeInTheDocument();
  });

  it("shows loading state distinctly", () => {
    useDashboardsMock.mockReturnValue({
      items: [],
      loading: true,
      error: null,
      retry: vi.fn(),
    });

    render(
      <MemoryRouter>
        <DashboardSwitcher workspaceId="ws-1" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dashboards ▾" }));
    expect(screen.getByText("Loading dashboards...")).toBeInTheDocument();
    expect(screen.queryByText("No dashboards found")).not.toBeInTheDocument();
  });
});
