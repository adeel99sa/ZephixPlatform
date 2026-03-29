import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginPage from "../LoginPage";

const navigateMock = vi.fn();
const loginMock = vi.fn();
const refreshMeMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ search: "?returnUrl=%2Fadministration" }),
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  };
});

vi.mock("@/state/AuthContext", () => ({
  useAuth: () => ({
    login: loginMock,
    refreshMe: refreshMeMock,
  }),
}));

describe("LoginPage onboarding redirects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loginMock.mockResolvedValue(undefined);
  });

  it("redirects new users to /onboarding after login", async () => {
    refreshMeMock.mockResolvedValue({ onboardingCompleted: false });

    const { container } = render(<LoginPage />);
    fireEvent.change(screen.getAllByRole("textbox")[0], {
      target: { value: "new@zephix.dev" },
    });
    fireEvent.change(container.querySelector('input[type="password"]') as HTMLInputElement, {
      target: { value: "Pass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in securely/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith("new@zephix.dev", "Pass123!");
    });
    expect(navigateMock).toHaveBeenCalledWith("/onboarding", { replace: true });
  });

  it.each(["ADMIN", "MEMBER", "VIEWER"] as const)(
    "redirects onboarded %s users to /home after login",
    async (platformRole) => {
      refreshMeMock.mockResolvedValue({ onboardingCompleted: true, platformRole });

      const { container } = render(<LoginPage />);
      fireEvent.change(screen.getAllByRole("textbox")[0], {
        target: { value: "existing@zephix.dev" },
      });
      fireEvent.change(container.querySelector('input[type="password"]') as HTMLInputElement, {
        target: { value: "Pass123!" },
      });
      fireEvent.click(screen.getByRole("button", { name: /sign in securely/i }));

      await waitFor(() => {
        expect(loginMock).toHaveBeenCalledWith("existing@zephix.dev", "Pass123!");
      });
      expect(navigateMock).toHaveBeenCalledWith("/home", { replace: true });
      expect(navigateMock).not.toHaveBeenCalledWith("/administration", { replace: true });
    },
  );
});
