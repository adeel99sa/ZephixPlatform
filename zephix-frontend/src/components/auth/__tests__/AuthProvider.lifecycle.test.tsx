import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { useAuthStore, type User } from "@/stores/authStore";

function AuthProbe() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);
  const error = useAuthStore((state) => state.error);

  return (
    <div>
      <div data-testid="auth-state">{isAuthenticated ? "authenticated" : "unauthenticated"}</div>
      <div data-testid="auth-loading">{isLoading ? "loading" : "ready"}</div>
      <div data-testid="auth-user">{user?.email ?? "none"}</div>
      <div data-testid="auth-error">{error ?? "none"}</div>
    </div>
  );
}

const validUser: User = {
  id: "user-1",
  email: "valid@zephix.io",
  firstName: "Valid",
  lastName: "User",
  role: "member",
  organizationId: "org-1",
  isEmailVerified: true,
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z",
};

describe("AuthProvider bootstrap lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isHydrated: true,
    });
  });

  it("valid session: checkAuth resolves authenticated user and one-time bootstrap remains deterministic", async () => {
    const checkAuth = vi.fn(async () => {
      useAuthStore.setState({
        user: validUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    });

    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      checkAuth,
    });

    const { rerender } = render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(checkAuth).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent("authenticated");
      expect(screen.getByTestId("auth-loading")).toHaveTextContent("ready");
      expect(screen.getByTestId("auth-user")).toHaveTextContent("valid@zephix.io");
    });

    rerender(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );
    expect(checkAuth).toHaveBeenCalledTimes(1);
  });

  it("expired session: provider clears stale session truth and exits loading", async () => {
    const checkAuth = vi.fn(async () => {
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: "Unauthorized",
      });
      return false;
    });

    useAuthStore.setState({
      user: validUser,
      isAuthenticated: true,
      isLoading: true,
      error: null,
      checkAuth,
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(checkAuth).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent("unauthenticated");
      expect(screen.getByTestId("auth-loading")).toHaveTextContent("ready");
      expect(screen.getByTestId("auth-user")).toHaveTextContent("none");
      expect(screen.getByTestId("auth-error")).toHaveTextContent("Unauthorized");
    });
  });

  it("logged-out state: provider resolves clean unauthenticated state with no stale user", async () => {
    const checkAuth = vi.fn(async () => {
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      return false;
    });

    useAuthStore.setState({
      user: validUser,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      checkAuth,
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(checkAuth).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent("unauthenticated");
      expect(screen.getByTestId("auth-loading")).toHaveTextContent("ready");
      expect(screen.getByTestId("auth-user")).toHaveTextContent("none");
      expect(screen.getByTestId("auth-error")).toHaveTextContent("none");
    });
  });
});
