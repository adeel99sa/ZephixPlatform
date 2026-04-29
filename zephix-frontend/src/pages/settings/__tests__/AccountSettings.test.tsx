import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

const refreshMe = vi.fn().mockResolvedValue(null);

vi.mock("@/state/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "u1",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      organizationId: "org-1",
      permissions: { isAdmin: true },
    },
    refreshMe,
  }),
}));

import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { AccountSettings } from "../components/AccountSettings";

describe("AccountSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({
      firstName: "John",
      lastName: "Doe",
      email: "test@example.com",
      profilePicture: "",
    });
    vi.mocked(apiClient.patch).mockResolvedValue({});
    vi.mocked(apiClient.post).mockResolvedValue({});
  });

  it("loads profile from GET /auth/profile and shows controlled fields", async () => {
    render(<AccountSettings />);
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("/auth/profile");
    });
    expect(screen.getByTestId("settings-account-first-name")).toHaveValue("John");
    expect(screen.getByTestId("settings-account-last-name")).toHaveValue("Doe");
    expect(screen.getByTestId("settings-account-email")).toHaveValue("test@example.com");
  });

  it("updates first name input value", async () => {
    render(<AccountSettings />);
    await waitFor(() => {
      expect(screen.getByTestId("settings-account-first-name")).toHaveValue("John");
    });
    fireEvent.change(screen.getByTestId("settings-account-first-name"), {
      target: { value: "Jane" },
    });
    expect(screen.getByTestId("settings-account-first-name")).toHaveValue("Jane");
  });

  it("save profile sends PATCH only with changed fields and calls refreshMe", async () => {
    render(<AccountSettings />);
    await waitFor(() => {
      expect(screen.getByTestId("settings-account-first-name")).toHaveValue("John");
    });

    fireEvent.change(screen.getByTestId("settings-account-first-name"), {
      target: { value: "Jane" },
    });
    fireEvent.click(screen.getByTestId("settings-account-save-profile"));

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith("/auth/profile", {
        firstName: "Jane",
      });
    });
    expect(refreshMe).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Profile saved.");
  });

  it("save profile shows error and does not clear inputs on failure", async () => {
    vi.mocked(apiClient.patch).mockRejectedValueOnce(new Error("Validation failed"));

    render(<AccountSettings />);
    await waitFor(() => {
      expect(screen.getByTestId("settings-account-first-name")).toHaveValue("John");
    });

    fireEvent.change(screen.getByTestId("settings-account-first-name"), {
      target: { value: "Jane" },
    });
    fireEvent.click(screen.getByTestId("settings-account-save-profile"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Validation failed");
    });
    expect(screen.getByTestId("settings-account-first-name")).toHaveValue("Jane");
  });

  it("password save validates confirm match", async () => {
    render(<AccountSettings />);
    await waitFor(() => {
      expect(screen.getByTestId("settings-account-first-name")).toHaveValue("John");
    });

    fireEvent.change(screen.getByTestId("settings-account-current-password"), {
      target: { value: "oldpass" },
    });
    fireEvent.change(screen.getByTestId("settings-account-new-password"), {
      target: { value: "newpass123" },
    });
    fireEvent.change(screen.getByTestId("settings-account-confirm-password"), {
      target: { value: "different" },
    });
    fireEvent.click(screen.getByTestId("settings-account-save-password"));

    await waitFor(() => {
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("password save calls POST /auth/change-password and clears fields on success", async () => {
    render(<AccountSettings />);
    await waitFor(() => {
      expect(screen.getByTestId("settings-account-first-name")).toHaveValue("John");
    });

    fireEvent.change(screen.getByTestId("settings-account-current-password"), {
      target: { value: "oldpass123" },
    });
    fireEvent.change(screen.getByTestId("settings-account-new-password"), {
      target: { value: "newpass1234" },
    });
    fireEvent.change(screen.getByTestId("settings-account-confirm-password"), {
      target: { value: "newpass1234" },
    });
    fireEvent.click(screen.getByTestId("settings-account-save-password"));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/auth/change-password", {
        currentPassword: "oldpass123",
        newPassword: "newpass1234",
      });
    });
    expect(screen.getByTestId("settings-account-current-password")).toHaveValue("");
    expect(screen.getByTestId("settings-account-new-password")).toHaveValue("");
    expect(screen.getByTestId("settings-account-confirm-password")).toHaveValue("");
    expect(toast.success).toHaveBeenCalledWith("Password updated.");
  });

  it("disables profile save button while saving", async () => {
    let resolvePatch: (v: unknown) => void = () => {};
    vi.mocked(apiClient.patch).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePatch = resolve;
        }),
    );

    render(<AccountSettings />);
    await waitFor(() => {
      expect(screen.getByTestId("settings-account-first-name")).toHaveValue("John");
    });

    fireEvent.change(screen.getByTestId("settings-account-first-name"), {
      target: { value: "Jane" },
    });
    fireEvent.click(screen.getByTestId("settings-account-save-profile"));

    expect(screen.getByTestId("settings-account-save-profile")).toBeDisabled();
    resolvePatch({});
    await waitFor(() => {
      expect(screen.getByTestId("settings-account-save-profile")).not.toBeDisabled();
    });
  });
});
