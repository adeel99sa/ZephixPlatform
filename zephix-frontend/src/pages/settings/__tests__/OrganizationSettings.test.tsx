import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockSetCurrent = vi.fn();
const mockSetOrgs = vi.fn();

vi.mock("@/stores/organizationStore", () => ({
  useOrganizationStore: (sel: (s: unknown) => unknown) =>
    sel({
      currentOrganization: { id: "org-1", name: "Acme" },
      organizations: [{ id: "org-1", name: "Acme" }],
      setCurrentOrganization: mockSetCurrent,
      setOrganizations: mockSetOrgs,
    }),
}));

vi.mock("@/state/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "u1", organizationId: "org-1", permissions: { isAdmin: true } },
  })),
}));

import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/state/AuthContext";
import { OrganizationSettings } from "../components/OrganizationSettings";

const mockUseAuth = vi.mocked(useAuth);

const baseOrg = {
  id: "org-1",
  name: "Acme Corp",
  slug: "acme",
  status: "active" as const,
  description: "Desc",
  website: "https://acme.com",
  industry: "Tech",
  size: "medium" as const,
  settings: {},
  createdAt: "",
  updatedAt: "",
};

describe("OrganizationSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue(baseOrg);
    vi.mocked(apiClient.patch).mockImplementation(async (_url, body) => ({
      ...baseOrg,
      ...(body as object),
    }));
  });

  it("loads organization and renders fields", async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "u1",
        organizationId: "org-1",
        permissions: { isAdmin: true },
      },
    } as any);

    render(<OrganizationSettings />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("/organizations/org-1");
    });
    expect(screen.getByTestId("settings-org-name")).toHaveValue("Acme Corp");
    expect(screen.getByTestId("settings-org-website")).toHaveValue("https://acme.com");
  });

  it("non-admin: disables inputs and save", async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "u1",
        organizationId: "org-1",
        permissions: { isAdmin: false },
      },
    } as any);

    render(<OrganizationSettings />);

    await waitFor(() => {
      expect(screen.getByTestId("settings-org-name")).toBeDisabled();
    });
    expect(
      screen.getByText(/Only organization admins can edit/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("settings-organization-save")).toBeDisabled();
  });

  it("admin: PATCH diff only and toast success", async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "u1",
        organizationId: "org-1",
        permissions: { isAdmin: true },
      },
    } as any);

    render(<OrganizationSettings />);

    await waitFor(() => {
      expect(screen.getByTestId("settings-org-name")).toHaveValue("Acme Corp");
    });

    fireEvent.change(screen.getByTestId("settings-org-industry"), {
      target: { value: "Finance" },
    });
    fireEvent.click(screen.getByTestId("settings-organization-save"));

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith("/organizations/org-1", {
        industry: "Finance",
      });
    });
    expect(toast.success).toHaveBeenCalledWith("Organization settings saved.");
    expect(mockSetOrgs).toHaveBeenCalled();
  });

  it("size select lists enum options", async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "u1",
        organizationId: "org-1",
        permissions: { isAdmin: true },
      },
    } as any);

    render(<OrganizationSettings />);

    await waitFor(() => {
      expect(screen.getByTestId("settings-org-size")).toBeInTheDocument();
    });
    const sel = screen.getByTestId("settings-org-size") as HTMLSelectElement;
    const texts = Array.from(sel.options).map((o) => o.textContent);
    expect(texts).toContain("Enterprise");
  });
});
