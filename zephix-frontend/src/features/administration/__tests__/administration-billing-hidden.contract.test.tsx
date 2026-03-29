import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequireAdminInline } from "@/routes/RequireAdminInline";
import { ADMINISTRATION_NAV_SECTIONS } from "@/features/administration/constants";
import AdministrationBillingPage from "@/features/administration/pages/AdministrationBillingPage";

type MockAuthState = {
  user: any | null;
  loading: boolean;
};

let mockAuthState: MockAuthState = {
  user: null,
  loading: false,
};

vi.mock("@/state/AuthContext", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("@/features/administration/api/administration.api", () => ({
  administrationApi: {
    getBillingSummary: vi.fn().mockResolvedValue({
      currentPlan: "team",
      planStatus: "active",
      renewalDate: "2026-12-01T00:00:00.000Z",
      usage: {
        activeUsers: 7,
        workspaces: 2,
        storageBytesUsed: 4096,
      },
    }),
    getBillingInvoices: vi.fn().mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    }),
  },
}));

function renderBillingRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/administration/billing"
          element={
            <RequireAdminInline>
              <AdministrationBillingPage />
            </RequireAdminInline>
          }
        />
        <Route path="/home" element={<div>HOME_REDIRECT</div>} />
        <Route path="/login" element={<div>LOGIN_REDIRECT</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("administration billing hidden contract", () => {
  beforeEach(() => {
    mockAuthState = {
      user: null,
      loading: false,
    };
  });

  it("keeps Templates hidden while Billing is visible in administration navigation", () => {
    const labels = ADMINISTRATION_NAV_SECTIONS.flatMap((section) =>
      section.items.map((item) => item.label),
    );
    expect(labels).toContain("Billing");
    expect(labels).toContain("Data Management");
    expect(labels).not.toContain("Templates");
  });

  it("renders /administration/billing for org admin", async () => {
    mockAuthState = {
      user: { id: "admin-1", platformRole: "ADMIN", permissions: {} },
      loading: false,
    };
    renderBillingRoute("/administration/billing");
    expect(await screen.findByRole("heading", { name: "Billing" })).toBeInTheDocument();
    expect(screen.getByText(/Read-only mode/i)).toBeInTheDocument();
    expect(screen.getByText(/Payment method details are not exposed/i)).toBeInTheDocument();
  });

  it("blocks member from /administration/billing", async () => {
    mockAuthState = {
      user: { id: "member-1", platformRole: "MEMBER", permissions: {} },
      loading: false,
    };
    renderBillingRoute("/administration/billing");
    expect(await screen.findByText("HOME_REDIRECT")).toBeInTheDocument();
  });

  it("blocks viewer from /administration/billing", async () => {
    mockAuthState = {
      user: { id: "viewer-1", platformRole: "VIEWER", permissions: {} },
      loading: false,
    };
    renderBillingRoute("/administration/billing");
    expect(await screen.findByText("HOME_REDIRECT")).toBeInTheDocument();
  });

  it("redirects unauthenticated users to login", async () => {
    mockAuthState = {
      user: null,
      loading: false,
    };
    renderBillingRoute("/administration/billing");
    expect(await screen.findByText("LOGIN_REDIRECT")).toBeInTheDocument();
  });
});
