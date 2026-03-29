import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import SettingsLayout from "../layouts/SettingsLayout";
import WorkspaceGeneralSettings from "../pages/WorkspaceGeneralSettings";
import SecuritySettings from "../pages/SecuritySettings";
import BillingSettings from "../pages/BillingSettings";
import MembersSettings from "../pages/MembersSettings";
import TeamsSettings from "../pages/TeamsSettings";
import PolicyEngineSettings from "../pages/PolicyEngineSettings";
import TemplateEnforcementSettings from "../pages/TemplateEnforcementSettings";
import CapacityRulesSettings from "../pages/CapacityRulesSettings";
import ExceptionWorkflowsSettings from "../pages/ExceptionWorkflowsSettings";
import AuditLogsSettings from "../pages/AuditLogsSettings";
import CustomFieldsSettings from "../pages/CustomFieldsSettings";
import StatusWorkflowsSettings from "../pages/StatusWorkflowsSettings";
import RiskMatrixSettings from "../pages/RiskMatrixSettings";
import IntegrationsSettings from "../pages/IntegrationsSettings";
import TemplateLibrarySettings from "../pages/TemplateLibrarySettings";
import TemplateBuilderSettings from "../pages/TemplateBuilderSettings";
import AiPolicySettings from "../pages/AiPolicySettings";
import AssistantBehaviorSettings from "../pages/AssistantBehaviorSettings";
import AiAuditSettings from "../pages/AiAuditSettings";
import { PlaceholderPage } from "../components/PlaceholderPage";

function renderSettings(initialPath: string): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/settings" element={<SettingsLayout />}>
          <Route path="general" element={<WorkspaceGeneralSettings />} />
          <Route path="security-sso" element={<SecuritySettings />} />
          <Route path="billing" element={<BillingSettings />} />
          <Route path="members" element={<MembersSettings />} />
          <Route path="teams" element={<TeamsSettings />} />
          <Route path="policy-engine" element={<PolicyEngineSettings />} />
          <Route
            path="template-enforcement"
            element={<TemplateEnforcementSettings />}
          />
          <Route path="capacity-rules" element={<CapacityRulesSettings />} />
          <Route
            path="exception-workflows"
            element={<ExceptionWorkflowsSettings />}
          />
          <Route path="audit-logs" element={<AuditLogsSettings />} />
          <Route path="custom-fields" element={<CustomFieldsSettings />} />
          <Route
            path="status-workflows"
            element={<StatusWorkflowsSettings />}
          />
          <Route path="risk-matrix" element={<RiskMatrixSettings />} />
          <Route path="integrations" element={<IntegrationsSettings />} />
          <Route
            path="template-library"
            element={<TemplateLibrarySettings />}
          />
          <Route
            path="template-builder/new"
            element={<TemplateBuilderSettings />}
          />
          <Route
            path="template-builder/:templateId"
            element={<TemplateBuilderSettings />}
          />
          <Route path="ai-policy" element={<AiPolicySettings />} />
          <Route path="ai-assistant" element={<AssistantBehaviorSettings />} />
          <Route path="ai-audit" element={<AiAuditSettings />} />
          <Route path="profile" element={<PlaceholderPage title="Profile" />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Settings shell (B-1 / B-2)", () => {
  it("renders layout with sidebar and workspace general content", () => {
    renderSettings("/settings/general");

    expect(document.querySelector("[data-settings-layout]")).toBeInTheDocument();
    expect(document.querySelector("[data-settings-preview-banner]")).toBeInTheDocument();
    expect(screen.getByText("Preview only")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to app/i })).toHaveAttribute("href", "/home");
    expect(document.querySelector("[data-settings-workspace-general]")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Workspace Settings" })).toBeInTheDocument();
  });

  it("renders placeholder for non-implemented routes", () => {
    renderSettings("/settings/profile");

    expect(document.querySelector("[data-settings-placeholder]")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });

  it("renders Security & SSO settings page", () => {
    renderSettings("/settings/security-sso");

    expect(document.querySelector("[data-settings-security-sso]")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Security & SSO" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });

  it("renders Billing & Plan settings page", () => {
    renderSettings("/settings/billing");

    expect(document.querySelector("[data-settings-billing]")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Billing & Plan" })).toBeInTheDocument();
    expect(screen.getByText(/Sample tier — preview/i)).toBeInTheDocument();
  });

  it("renders Members & Roles with tabs and invite control", () => {
    renderSettings("/settings/members");

    expect(document.querySelector("[data-settings-members]")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Members & Roles" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Full Members \(sample\)/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open invite preview" })).toBeInTheDocument();
  });

  it("renders Teams page with search and create", () => {
    renderSettings("/settings/teams");

    expect(document.querySelector("[data-settings-teams]")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Teams" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search teams...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Team" })).toBeInTheDocument();
  });

  it("renders Policy Engine (B-4) with save gated on dirty", () => {
    renderSettings("/settings/policy-engine");

    expect(document.querySelector("[data-settings-policy-engine]")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Policy Engine" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });

  it("renders Template Enforcement (B-4)", () => {
    renderSettings("/settings/template-enforcement");

    expect(
      document.querySelector("[data-settings-template-enforcement]"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Template Enforcement" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });

  it("renders Capacity Rules (B-5) with save gated on dirty", () => {
    renderSettings("/settings/capacity-rules");

    expect(document.querySelector("[data-settings-capacity-rules]")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Capacity Rules" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });

  it("renders Exception Workflows (B-5) with save gated on dirty", () => {
    renderSettings("/settings/exception-workflows");

    expect(
      document.querySelector("[data-settings-exception-workflows]"),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Exception Workflows" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });

  it("renders Audit Logs (B-5) read-only without save", () => {
    renderSettings("/settings/audit-logs");

    expect(document.querySelector("[data-settings-audit-logs]")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Audit Logs" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Changes" })).not.toBeInTheDocument();
    expect(screen.getByText("Sarah Connor (Governance)")).toBeInTheDocument();
  });

  it("renders Custom Fields (B-6) with modal and save gated on dirty", async () => {
    const user = userEvent.setup();
    renderSettings("/settings/custom-fields");

    expect(document.querySelector("[data-settings-custom-fields]")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Custom Fields" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Create Field" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create Field" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders Status Workflows (B-6) with save gated on dirty", () => {
    renderSettings("/settings/status-workflows");

    expect(document.querySelector("[data-settings-status-workflows]")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Status Workflows" })).toBeInTheDocument();
    expect(screen.getByText("TODO")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });

  it("renders Risk Matrix (B-6) with save gated on dirty", () => {
    renderSettings("/settings/risk-matrix");

    expect(document.querySelector("[data-settings-risk-matrix]")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Risk Matrix" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });

  it("renders Template Library (B-7) with 12 seeded templates", () => {
    renderSettings("/settings/template-library");

    expect(document.querySelector("[data-settings-template-library]")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Template Library" })).toBeInTheDocument();
    expect(screen.getByText("Simple Project")).toBeInTheDocument();
    expect(screen.getByText("Waterfall Phase-Gate")).toBeInTheDocument();
  });

  it("renders Template Builder (B-7) for new template", () => {
    renderSettings("/settings/template-builder/new");

    expect(document.querySelector("[data-settings-template-builder]")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "New Template" })).toBeInTheDocument();
    expect(document.querySelector("[data-settings-template-preview]")).toBeInTheDocument();
    expect(document.querySelector("[data-settings-template-versioning]")).toBeInTheDocument();
  });

  it("renders Template Builder (B-7) for Waterfall template with gates in preview", () => {
    renderSettings("/settings/template-builder/waterfall-phase-gate");

    expect(screen.getByText("Waterfall Phase-Gate")).toBeInTheDocument();
    expect(screen.getByText(/Initiation Review/i)).toBeInTheDocument();
  });

  it("renders AI Policy (B-8) with save gated on dirty", () => {
    renderSettings("/settings/ai-policy");

    expect(document.querySelector("[data-settings-ai-policy]")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI Policy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });

  it("renders AI Assistant behavior (B-8) with save gated on dirty", () => {
    renderSettings("/settings/ai-assistant");

    expect(document.querySelector("[data-settings-ai-assistant]")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI Assistant" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });

  it("renders AI Audit (B-8) with save gated on dirty", () => {
    renderSettings("/settings/ai-audit");

    expect(document.querySelector("[data-settings-ai-audit]")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI Audit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });

  it("renders Integrations (B-6) without save", () => {
    renderSettings("/settings/integrations");

    expect(document.querySelector("[data-settings-integrations]")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Integrations" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Changes" })).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Preview connect" }).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("delete workspace requires exact name before confirm is enabled", async () => {
    const user = userEvent.setup();
    renderSettings("/settings/general");

    await user.click(screen.getByRole("button", { name: "Open delete preview" }));

    const dialog = await screen.findByRole("dialog");
    const confirmBtn = within(dialog).getByRole("button", { name: "Close delete preview" });

    expect(confirmBtn).toBeDisabled();

    const confirmInput = within(dialog).getByLabelText(
      /type sample workspace name to confirm this preview/i,
    );
    await user.type(confirmInput, "Acme Corp");

    expect(confirmBtn).not.toBeDisabled();
  });
});
