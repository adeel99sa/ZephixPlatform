import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Header } from "@/components/shell/Header";

const navigateMock = vi.fn();
const authState: { user: any } = {
  user: { platformRole: "ADMIN" },
};
const workspaceState: { activeWorkspaceId: string | null } = {
  activeWorkspaceId: "ws-1",
};
const routerState: { pathname: string } = {
  pathname: "/home",
};

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ pathname: routerState.pathname }),
  };
});

vi.mock("@/state/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/state/workspace.store", () => ({
  useWorkspaceStore: (selector: (state: any) => any) => selector(workspaceState),
}));

vi.mock("@/components/command/CommandPalette", () => ({
  CommandPalette: () => null,
}));

vi.mock("@/components/shell/AiToggleButton", () => ({
  AiToggleButton: () => <div data-testid="ai-toggle" />,
}));

vi.mock("@/features/notifications/components/NotificationBell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

vi.mock("@/components/shell/UserProfileDropdown", () => ({
  UserProfileDropdown: () => <div data-testid="user-profile-dropdown" />,
}));

vi.mock("@/lib/telemetry", () => ({
  track: vi.fn(),
}));

describe("header admin entry and exit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem("zephix.lastWorkspaceId");
    authState.user = { platformRole: "ADMIN" };
    workspaceState.activeWorkspaceId = "ws-1";
    routerState.pathname = "/administration/general";
  });

  it("shows Admin Console and Back to App for admin", () => {
    render(<Header />);
    expect(screen.getByTestId("header-admin-console")).toBeInTheDocument();
    expect(screen.getByTestId("header-back-to-app")).toBeInTheDocument();
  });

  it("navigates to administration from header control", () => {
    render(<Header />);
    fireEvent.click(screen.getByTestId("header-admin-console"));
    expect(navigateMock).toHaveBeenCalledWith("/administration");
  });

  it("Back to App prefers active workspace dashboard", () => {
    render(<Header />);
    fireEvent.click(screen.getByTestId("header-back-to-app"));
    expect(navigateMock).toHaveBeenCalledWith("/workspaces/ws-1/dashboard");
  });

  it("Back to App uses lastWorkspaceId when active workspace is missing", () => {
    workspaceState.activeWorkspaceId = null;
    localStorage.setItem("zephix.lastWorkspaceId", "ws-2");
    render(<Header />);
    fireEvent.click(screen.getByTestId("header-back-to-app"));
    expect(navigateMock).toHaveBeenCalledWith("/workspaces/ws-2/dashboard");
  });

  it("Back to App falls back to /home when no workspace context exists", () => {
    workspaceState.activeWorkspaceId = null;
    render(<Header />);
    fireEvent.click(screen.getByTestId("header-back-to-app"));
    expect(navigateMock).toHaveBeenCalledWith("/home");
  });

  it("hides admin controls for non-admin roles", () => {
    authState.user = { platformRole: "MEMBER" };
    render(<Header />);
    expect(screen.queryByTestId("header-admin-console")).not.toBeInTheDocument();
    expect(screen.queryByTestId("header-back-to-app")).not.toBeInTheDocument();
  });
});
