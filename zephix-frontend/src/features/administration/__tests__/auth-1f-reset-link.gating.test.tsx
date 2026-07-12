/**
 * AUTH-1F — admin reset-link UI (People page + modal).
 *
 * Security invariants: reset URL only in modal; never toast; never console;
 * copy only on explicit user action.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AdministrationUsersPage from "@/features/administration/pages/AdministrationUsersPage";
import {
  SendResetLinkDialog,
  SEND_RESET_LINK_HONEST_COPY,
} from "@/features/administration/components/SendResetLinkDialog";
import { canUseAdministrationPeopleUi } from "@/lib/auth/role-checks";

const RESET_URL =
  "https://app.example.com/reset-password?token=secret-reset-token-abc";

vi.mock("@/features/administration/api/administration.api", () => ({
  administrationApi: {
    listUsers: vi.fn(),
    changeUserRole: vi.fn(),
    deactivateUser: vi.fn(),
    inviteOrgUserV1: vi.fn(),
    generateUserResetLink: vi.fn(),
  },
}));

vi.mock("@/features/administration/components/InviteOrgMemberDialog", () => ({
  InviteOrgMemberDialog: () => null,
}));

vi.mock("@/features/administration/components/EditOrgMemberDialog", () => ({
  EditOrgMemberDialog: () => null,
}));

import { administrationApi } from "@/features/administration/api/administration.api";

const member = {
  id: "user-1",
  name: "Sandbox Member",
  email: "sandbox.member@example.com",
  role: "member" as const,
  platformRole: "member" as const,
  teams: [],
  status: "active" as const,
  workspaceAccess: [],
  lastActiveAt: null,
  joinedAt: null,
  isOwner: false,
};

describe("AUTH-1F admin reset-link", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    writeText.mockClear();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    vi.mocked(administrationApi.listUsers).mockResolvedValue({
      data: [member],
      meta: { page: 1, limit: 100, total: 1 },
      seatLimit: 10,
      memberCount: 1,
    });
    vi.mocked(administrationApi.generateUserResetLink).mockResolvedValue({
      resetLink: RESET_URL,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      userId: "user-1",
      expiresInMinutes: 60,
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  it("People UI helper is admin-only (route surface gate)", () => {
    expect(canUseAdministrationPeopleUi({ platformRole: "ADMIN" })).toBe(true);
    expect(canUseAdministrationPeopleUi({ platformRole: "MEMBER" })).toBe(false);
    expect(canUseAdministrationPeopleUi({ platformRole: "VIEWER" })).toBe(false);
  });

  it("shows Send reset link row action and opens modal with link + honest copy", async () => {
    const user = userEvent.setup();
    render(<AdministrationUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Sandbox Member")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /open actions for sandbox member/i }));
    expect(screen.getByRole("menuitem", { name: /send reset link/i })).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: /send reset link/i }));

    await waitFor(() => {
      expect(administrationApi.generateUserResetLink).toHaveBeenCalledWith("user-1");
    });

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(SEND_RESET_LINK_HONEST_COPY)).toBeInTheDocument();
    const linkInput = within(dialog).getByLabelText(/password reset link/i) as HTMLInputElement;
    expect(linkInput.value).toBe(RESET_URL);

    // No auto-copy
    expect(writeText).not.toHaveBeenCalled();

    // URL must not appear in any toast-like region outside the dialog input
    expect(screen.queryByRole("status", { name: /toast/i })).not.toBeInTheDocument();
    const toasts = document.querySelectorAll("[data-testid='toast'], [role='status'].toast");
    toasts.forEach((el) => {
      expect(el.textContent ?? "").not.toContain(RESET_URL);
    });
  });

  it("copies only after explicit Copy click", async () => {
    const user = userEvent.setup();
    const clipboardSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    render(
      <SendResetLinkDialog
        isOpen
        onClose={vi.fn()}
        userId="user-1"
        userLabel="Sandbox Member"
      />,
    );

    const linkInput = await screen.findByLabelText(/password reset link/i);
    expect((linkInput as HTMLInputElement).value).toBe(RESET_URL);
    expect(clipboardSpy).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /^copy$/i }));
    await waitFor(() => {
      expect(clipboardSpy).toHaveBeenCalledTimes(1);
      expect(clipboardSpy).toHaveBeenCalledWith(RESET_URL);
    });
    expect(screen.getByText(/link copied to clipboard/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copied/i })).toBeInTheDocument();
  });

  it("shows loading then 403 explanatory copy", async () => {
    vi.mocked(administrationApi.generateUserResetLink).mockRejectedValue({
      response: { status: 403, data: { message: "Forbidden" } },
    });

    render(
      <SendResetLinkDialog isOpen onClose={vi.fn()} userId="user-x" userLabel="Other Org" />,
    );

    expect(screen.getByText(/generating reset link/i)).toBeInTheDocument();

    expect(
      await screen.findByText(/only generate reset links for people in your organization/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/password reset link/i)).not.toBeInTheDocument();
  });

  it("shows 404 explanatory copy when user is missing", async () => {
    vi.mocked(administrationApi.generateUserResetLink).mockRejectedValue({
      response: { status: 404, data: { message: "Not found" } },
    });

    render(
      <SendResetLinkDialog isOpen onClose={vi.fn()} userId="missing" userLabel="Gone" />,
    );

    expect(
      await screen.findByText(/user was not found/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/password reset link/i)).not.toBeInTheDocument();
  });

  it("never console-logs the reset URL", async () => {
    render(
      <SendResetLinkDialog isOpen onClose={vi.fn()} userId="user-1" userLabel="Sandbox Member" />,
    );

    await screen.findByLabelText(/password reset link/i);

    for (const spy of [consoleLogSpy, consoleInfoSpy, consoleDebugSpy]) {
      for (const call of spy.mock.calls) {
        const serialized = call.map((arg) => String(arg)).join(" ");
        expect(serialized).not.toContain(RESET_URL);
        expect(serialized).not.toContain("secret-reset-token");
      }
    }
  });
});
