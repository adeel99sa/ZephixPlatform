import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdministrationIntegrationsPage from "@/features/administration/pages/AdministrationIntegrationsPage";

vi.mock("@/features/administration/api/administration.api", () => ({
  administrationApi: {
    getIntegrationsSummary: vi.fn(),
    getIntegrationsApiAccess: vi.fn(),
    getIntegrationsWebhooks: vi.fn(),
  },
}));

import { administrationApi } from "@/features/administration/api/administration.api";

describe("administration integrations contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders source-backed sections with read-only governance labeling", async () => {
    vi.mocked(administrationApi.getIntegrationsSummary).mockResolvedValue({
      totals: {
        totalConnections: 2,
        enabledConnections: 1,
        webhookEnabledConnections: 1,
        erroredConnections: 0,
        providerCount: 1,
      },
      providers: ["jira"],
      editableControls: {
        adminMutationEnabled: false,
        reason: "Admin mutation contracts for integrations are not enabled in this phase.",
      },
    });
    vi.mocked(administrationApi.getIntegrationsApiAccess).mockResolvedValue({
      items: [
        {
          id: "conn-1",
          provider: "jira",
          authType: "api_token",
          baseUrl: "https://jira.example.com",
          email: "admin@example.com",
          enabled: true,
          pollingEnabled: false,
          webhookEnabled: true,
          status: "active",
          errorCount: 0,
          lastSyncStatus: "success",
          lastSyncRunAt: "2026-03-10T00:00:00.000Z",
          updatedAt: "2026-03-10T00:00:00.000Z",
        },
      ],
      mode: "read_only",
    });
    vi.mocked(administrationApi.getIntegrationsWebhooks).mockResolvedValue({
      items: [
        {
          connectionId: "conn-1",
          provider: "jira",
          destination: "https://jira.example.com",
          enabled: true,
          status: "active",
          updatedAt: "2026-03-10T00:00:00.000Z",
        },
      ],
      mode: "read_only",
    });

    render(
      <MemoryRouter>
        <AdministrationIntegrationsPage />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Integrations" })).toBeInTheDocument(),
    );

    expect(screen.getByText(/Read-only control plane for this phase/i)).toBeInTheDocument();
    expect(screen.getByText("Connected apps and API access")).toBeInTheDocument();
    expect(screen.getByText("Webhook governance")).toBeInTheDocument();
    expect(screen.getByText("JIRA")).toBeInTheDocument();
  });

  it("renders empty states when no integrations are available", async () => {
    vi.mocked(administrationApi.getIntegrationsSummary).mockResolvedValue({
      totals: {
        totalConnections: 0,
        enabledConnections: 0,
        webhookEnabledConnections: 0,
        erroredConnections: 0,
        providerCount: 0,
      },
      providers: [],
      editableControls: {
        adminMutationEnabled: false,
        reason: "Admin mutation contracts for integrations are not enabled in this phase.",
      },
    });
    vi.mocked(administrationApi.getIntegrationsApiAccess).mockResolvedValue({
      items: [],
      mode: "read_only",
    });
    vi.mocked(administrationApi.getIntegrationsWebhooks).mockResolvedValue({
      items: [],
      mode: "read_only",
    });

    render(
      <MemoryRouter>
        <AdministrationIntegrationsPage />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("No integrations connected")).toBeInTheDocument(),
    );
    expect(screen.getByText("No webhook routes enabled")).toBeInTheDocument();
  });
});
