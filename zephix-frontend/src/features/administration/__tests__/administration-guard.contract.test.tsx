import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequireAdminInline } from "@/routes/RequireAdminInline";

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

const ADMIN_ROUTES = [
  "/administration/general",
  "/administration/organization",
  "/administration/users",
  "/administration/teams",
  "/administration/security",
  "/administration/access-control",
  "/administration/audit-log",
  "/administration/integrations",
  "/administration/ai-governance",
  "/administration/billing",
  "/administration/data-management",
  "/administration/templates",
  "/administration/template-governance",
];

function renderGuardAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/administration/*"
          element={
            <RequireAdminInline>
              <div>ADMIN_OK</div>
            </RequireAdminInline>
          }
        />
        <Route path="/home" element={<div>HOME_REDIRECT</div>} />
        <Route path="/login" element={<div>LOGIN_REDIRECT</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("administration guard contract", () => {
  beforeEach(() => {
    mockAuthState = {
      user: null,
      loading: false,
    };
  });

  it.each(ADMIN_ROUTES)(
    "allows org admin access for %s",
    async (path) => {
      mockAuthState = {
        user: { id: "u1", platformRole: "ADMIN", permissions: {} },
        loading: false,
      };
      renderGuardAt(path);
      expect(await screen.findByText("ADMIN_OK")).toBeInTheDocument();
    },
  );

  it.each(ADMIN_ROUTES)(
    "denies member access for %s",
    async (path) => {
      mockAuthState = {
        user: { id: "u2", platformRole: "MEMBER", permissions: {} },
        loading: false,
      };
      renderGuardAt(path);
      expect(await screen.findByText("HOME_REDIRECT")).toBeInTheDocument();
    },
  );

  it.each(ADMIN_ROUTES)(
    "denies viewer access for %s",
    async (path) => {
      mockAuthState = {
        user: { id: "u3", platformRole: "VIEWER", permissions: {} },
        loading: false,
      };
      renderGuardAt(path);
      expect(await screen.findByText("HOME_REDIRECT")).toBeInTheDocument();
    },
  );

  it.each(ADMIN_ROUTES)(
    "redirects unauthenticated user to login for %s",
    async (path) => {
      mockAuthState = {
        user: null,
        loading: false,
      };
      renderGuardAt(path);
      expect(await screen.findByText("LOGIN_REDIRECT")).toBeInTheDocument();
    },
  );
});

