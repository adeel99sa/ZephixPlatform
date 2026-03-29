import React from "react";
import { BrowserRouter as Router, Navigate, Route, Routes, useParams } from "react-router-dom";

import ProtectedRoute from "@/routes/ProtectedRoute";
import PaidRoute from "@/routes/PaidRoute";
import { RequireAdminInline } from "@/routes/RequireAdminInline";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { AuthProvider, useAuth } from "@/state/AuthContext";
import { platformRoleFromUser } from "@/utils/roles";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { RouteLogger } from "@/components/routing/RouteLogger";

// Auth pages
import LoginPage from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import { InvitePage } from "@/pages/auth/InvitePage";
import { VerifyEmailPage } from "@/pages/auth/VerifyEmailPage";
import { InviteAcceptPage } from "@/pages/auth/InviteAcceptPage";

// System pages
import { NotFound } from "@/pages/system/NotFound";
import { Forbidden } from "@/pages/system/Forbidden";

// Views
import SelectWorkspacePage from "@/pages/workspaces/SelectWorkspacePage";
import GuestHomePage from "@/pages/home/GuestHomePage";
import OrgHomePage from "@/pages/home/OrgHomePage";
import RequireWorkspace from "@/routes/RequireWorkspace";
import { DashboardsIndex } from "@/views/dashboards/Index";
import { DashboardBuilder } from "@/views/dashboards/Builder";
import DashboardView from "@/views/dashboards/View";
import WorkspacesIndexPage from "@/views/workspaces/WorkspacesIndexPage";
import WorkspaceMembersPage from "@/features/workspaces/pages/WorkspaceMembersPage";
import WorkspaceSettingsPage from "@/features/workspaces/settings/WorkspaceSettingsPage";

import TemplateRouteSwitch from "@/pages/templates/TemplateRouteSwitch";
import DocsPage from "@/pages/docs/DocsPage";
import FormsPage from "@/pages/forms/FormsPage";
import { ProjectPlanView } from "@/views/work-management/ProjectPlanView";
import { TasksTab } from "@/features/projects/components/TasksTab";
import { ProjectOverviewTab, ProjectDocumentsTab, ProjectResourcesTab } from "@/features/projects/tabs";
import ProjectsPage from "@/pages/projects/ProjectsPage";
import ArchivedProjectsPage from "@/pages/projects/ArchivedProjectsPage";
import CreateFromTemplateWizard from "@/features/templates/wizard/CreateFromTemplateWizard";
import SettingsLayout from "@/features/settings/layouts/SettingsLayout";
import WorkspaceGeneralSettings from "@/features/settings/pages/WorkspaceGeneralSettings";
import SecuritySettings from "@/features/settings/pages/SecuritySettings";
import BillingSettings from "@/features/settings/pages/BillingSettings";
import MembersSettings from "@/features/settings/pages/MembersSettings";
import TeamsSettings from "@/features/settings/pages/TeamsSettings";
import PolicyEngineSettings from "@/features/settings/pages/PolicyEngineSettings";
import TemplateEnforcementSettings from "@/features/settings/pages/TemplateEnforcementSettings";
import CapacityRulesSettings from "@/features/settings/pages/CapacityRulesSettings";
import ExceptionWorkflowsSettings from "@/features/settings/pages/ExceptionWorkflowsSettings";
import AuditLogsSettings from "@/features/settings/pages/AuditLogsSettings";
import CustomFieldsSettings from "@/features/settings/pages/CustomFieldsSettings";
import StatusWorkflowsSettings from "@/features/settings/pages/StatusWorkflowsSettings";
import RiskMatrixSettings from "@/features/settings/pages/RiskMatrixSettings";
import IntegrationsSettings from "@/features/settings/pages/IntegrationsSettings";
import TemplateLibrarySettings from "@/features/settings/pages/TemplateLibrarySettings";
import TemplateBuilderSettings from "@/features/settings/pages/TemplateBuilderSettings";
import AiPolicySettings from "@/features/settings/pages/AiPolicySettings";
import AssistantBehaviorSettings from "@/features/settings/pages/AssistantBehaviorSettings";
import AiAuditSettings from "@/features/settings/pages/AiAuditSettings";
import { PlaceholderPage } from "@/features/settings/components/PlaceholderPage";
import { SETTINGS_PLACEHOLDER_ROUTES } from "@/features/settings/settingsFlatRoutes";
import ProfilePage from "@/pages/profile/ProfilePage";
import { useInboxDrawer } from "@/ui/shell/AppShell";
import ResourcesPage from "@/pages/ResourcesPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import OnboardingPage from "@/pages/onboarding/OnboardingPage";
import CreateFirstWorkspacePage from "@/pages/onboarding/CreateFirstWorkspacePage";
import BillingPage from "@/pages/billing/BillingPage";
import LandingPage from "@/pages/LandingPage";
import ResourceRiskCampaignPage from "@/pages/campaign/ResourceRiskCampaignPage";
import DemoRequestPage from "@/pages/marketing/DemoRequestPage";
import { isStagingMarketingLandingEnabled } from "@/lib/flags";

const StagingMarketingLandingPage = React.lazy(
  () => import("@/pages/staging/StagingMarketingLandingPage"),
);
import { ResourceHeatmapPage } from "@/pages/resources/ResourceHeatmapPage";
import { ResourceTimelinePage } from "@/pages/resources/ResourceTimelinePage";
import JoinWorkspacePage from "@/views/workspaces/JoinWorkspacePage";
import WorkspaceSlugRedirect from "@/views/workspaces/WorkspaceSlugRedirect";
import WorkspaceHomeBySlug from "@/views/workspaces/WorkspaceHomeBySlug";
// PHASE 6 MODULE 3-4: Program and Portfolio pages
import ProgramsListPage from "@/pages/programs/ProgramsListPage";
import ProgramDetailPage from "@/pages/programs/ProgramDetailPage";
import PortfoliosListPage from "@/pages/portfolios/PortfoliosListPage";
import PortfolioDetailPage from "@/pages/portfolios/PortfolioDetailPage";
import FeaturesRoute from "@/routes/FeaturesRoute";
// PHASE 7 MODULE 7.2: My Work
import MyWorkPage from "@/pages/my-work/MyWorkPage";
// Phase 2E: Capacity Engine
import CapacityPage from "@/features/capacity/CapacityPage";
// Phase 2F: What-If Scenarios
import ScenarioPage from "@/features/scenarios/ScenarioPage";
// Phase 4A: Organization Command Center
import OrgDashboardPage from "@/features/org-dashboard/OrgDashboardPage";
import AdministrationLayout from "@/features/administration/layout/AdministrationLayout";
import AdministrationOverviewPage from "@/features/administration/pages/AdministrationOverviewPage";
import AdministrationTemplatesPage from "@/features/administration/pages/AdministrationTemplatesPage";
import AdministrationTemplateGovernancePage from "@/features/administration/pages/AdministrationTemplateGovernancePage";
import AdministrationUsersPage from "@/features/administration/pages/AdministrationUsersPage";
import AdministrationOrganizationPage from "@/features/administration/pages/AdministrationOrganizationPage";
import AdministrationTeamsPage from "@/features/administration/pages/AdministrationTeamsPage";
import AdministrationAccessControlPage from "@/features/administration/pages/AdministrationAccessControlPage";
import AdministrationAuditLogPage from "@/features/administration/pages/AdministrationAuditLogPage";
import AdministrationSecurityPage from "@/features/administration/pages/AdministrationSecurityPage";
import AdministrationBillingPage from "@/features/administration/pages/AdministrationBillingPage";
import AdministrationIntegrationsPage from "@/features/administration/pages/AdministrationIntegrationsPage";
import AdministrationAIGovernancePage from "@/features/administration/pages/AdministrationAIGovernancePage";
import AdministrationDataManagementPage from "@/features/administration/pages/AdministrationDataManagementPage";
import RisksPage from "@/features/risks/pages/RisksPage";
import { useWorkspaceStore } from "@/state/workspace.store";
import OperationalDashboardPage from "@/features/dashboards/OperationalDashboardPage";
import { WorkspaceLayout } from "@/ui/workspace/WorkspaceLayout";
import { WorkspaceDocumentsPage } from "@/ui/workspace/WorkspaceDocumentsPage";
import { ProjectLayout } from "@/ui/project/ProjectLayout";
import {
  ProjectApprovalsSection,
  ProjectPlanDependencyStrip,
  ProjectRaidSection,
  ProjectReportsSection,
} from "@/ui/project/ProjectSectionPlaceholders";

/** "/" — authenticated users go to /home, guests see the marketing page */
function RootRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-z-bg-base text-sm text-z-text-secondary">
        Loading…
      </div>
    );
  }
  if (user) return <Navigate to="/home" replace />;
  if (isStagingMarketingLandingEnabled()) {
    return (
      <React.Suspense fallback={null}>
        <StagingMarketingLandingPage />
      </React.Suspense>
    );
  }
  return <LandingPage />;
}

/** Canonical /home — single calm Home for all roles */
function HomeRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <OrgHomePage />;
}

/** Legacy workspace paths redirect to canonical /workspaces/:id/dashboard */
function WorkspaceLegacyRedirect() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  if (!workspaceId) return <Navigate to="/home" replace />;
  return <Navigate to={`/workspaces/${workspaceId}/dashboard`} replace />;
}

/** /inbox → redirect to /home and open the inbox drawer */
function InboxRedirect() {
  const { openInbox } = useInboxDrawer();
  React.useEffect(() => { openInbox(); }, [openInbox]);
  return <Navigate to="/home" replace />;
}

function WorkspaceDashboardRoute() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  React.useEffect(() => {
    if (workspaceId) setActiveWorkspace(workspaceId);
  }, [workspaceId, setActiveWorkspace]);
  return <DashboardView />;
}

/**
 * Phase 2A: Inline paid-user guard — blocks VIEWER (guest) from accessing
 * routes that require Admin or Member role (e.g. /templates deep-link → modal, /workspaces/:id/members).
 */
function RequirePaidInline({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (platformRoleFromUser(user) === 'VIEWER') return <Navigate to="/home" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <RouteLogger />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<RootRoute />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/invites/accept" element={<InviteAcceptPage />} />
          <Route path="/invite" element={<InvitePage />} />
          <Route path="/campaign/resource-risk" element={<ResourceRiskCampaignPage />} />
          <Route path="/demo" element={<DemoRequestPage />} />
          <Route path="/contact" element={<Navigate to="/demo?intent=contact" replace />} />
          <Route path="/join/workspace" element={<JoinWorkspacePage />} />
          {/* PROMPT 10: Workspace slug route - redirects to /w/:slug/home */}
          <Route path="/w/:slug" element={<WorkspaceSlugRedirect />} />
          {/* PHASE 5.3: Workspace home route */}
          <Route path="/w/:slug/home" element={<WorkspaceHomeBySlug />} />

          {/* Protected routes with shell */}
          <Route element={<ProtectedRoute />}>
            {/* Onboarding route (no layout) */}
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/setup/workspace" element={<CreateFirstWorkspacePage />} />

            {/* ── AdminShell: standalone layout, no AppShell/Sidebar/Header ── */}
            <Route path="/administration" element={<RequireAdminInline><AdministrationLayout /></RequireAdminInline>}>
              <Route index element={<Navigate to="/administration/general" replace />} />
              <Route path="general" element={<AdministrationOverviewPage />} />
              <Route path="organization" element={<AdministrationOrganizationPage />} />
              <Route path="users" element={<AdministrationUsersPage />} />
              <Route path="teams" element={<AdministrationTeamsPage />} />
              <Route path="security" element={<AdministrationSecurityPage />} />
              <Route path="access-control" element={<AdministrationAccessControlPage />} />
              <Route path="audit-log" element={<AdministrationAuditLogPage />} />
              <Route path="integrations" element={<AdministrationIntegrationsPage />} />
              <Route path="ai-governance" element={<AdministrationAIGovernancePage />} />
              <Route path="billing" element={<AdministrationBillingPage />} />
              <Route path="data-management" element={<AdministrationDataManagementPage />} />
              <Route path="templates" element={<AdministrationTemplatesPage />} />
              <Route path="template-governance" element={<AdministrationTemplateGovernancePage />} />
            </Route>
            {/* Legacy admin compatibility paths — redirect before DashboardLayout renders */}
            <Route path="/admin" element={<RequireAdminInline><Navigate to="/administration" replace /></RequireAdminInline>} />
            <Route path="/admin/*" element={<RequireAdminInline><Navigate to="/administration" replace /></RequireAdminInline>} />

            {/* Main app routes with DashboardLayout (ApplicationShell) */}
            <Route element={
              <ErrorBoundary>
                <DashboardLayout />
              </ErrorBoundary>
            }>
              {/* ── Org-level routes (no workspace required) ── */}
              <Route path="/home" element={<HomeRoute />} />
              <Route path="/work" element={<Navigate to="/home" replace />} />
              <Route path="/documents" element={<Navigate to="/home" replace />} />
              <Route path="/my-tasks" element={<MyWorkPage />} />
              <Route path="/inbox" element={<InboxRedirect />} />
              <Route path="/select-workspace" element={<SelectWorkspacePage />} />
              <Route path="/guest/home" element={<GuestHomePage />} />
              <Route path="/workspaces" element={<WorkspacesIndexPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<RequireAdminInline><SettingsLayout /></RequireAdminInline>}>
                <Route index element={<Navigate to="general" replace />} />
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
                <Route
                  path="ai-assistant"
                  element={<AssistantBehaviorSettings />}
                />
                <Route path="ai-audit" element={<AiAuditSettings />} />
                {SETTINGS_PLACEHOLDER_ROUTES.map(({ path, title }) => (
                  <Route
                    key={path}
                    path={path}
                    element={<PlaceholderPage title={title} />}
                  />
                ))}
              </Route>
              {/* Phase 2A: Billing restricted to platform admin */}
              <Route path="/billing" element={<RequireAdminInline><BillingPage /></RequireAdminInline>} />
              <Route path="/org-dashboard" element={<RequireAdminInline><OrgDashboardPage /></RequireAdminInline>} />

              {/* ── Workspace-scoped routes (redirect to /home if none selected) ── */}
              <Route element={<RequireWorkspace />}>
                <Route path="/reports" element={<Navigate to="/analytics" replace />} />
                <Route path="/risks" element={<RisksPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/archive" element={<ArchivedProjectsPage />} />
                <Route path="/projects/new" element={<CreateFromTemplateWizard />} />
                {/* Project detail pages with normalized tabbed layout */}
                <Route path="/projects/:projectId" element={<ProjectLayout />}>
                  <Route index element={<Navigate to="overview" replace />} />
                  <Route path="overview" element={<ProjectOverviewTab />} />
                  <Route
                    path="plan"
                    element={
                      <>
                        <div className="p-4 pb-0">
                          <ProjectPlanDependencyStrip />
                        </div>
                        <ProjectPlanView />
                      </>
                    }
                  />
                  <Route path="execution" element={<TasksTab />} />
                  <Route path="approvals" element={<ProjectApprovalsSection />} />
                  <Route path="raid" element={<ProjectRaidSection />} />
                  <Route path="reports" element={<ProjectReportsSection />} />
                  <Route path="documents" element={<ProjectDocumentsTab />} />

                  {/* Legacy project route compatibility */}
                  <Route path="risks" element={<Navigate to="../raid" replace />} />
                  <Route path="lessons-learned" element={<Navigate to="../reports" replace />} />
                  <Route path="tasks" element={<Navigate to="../execution" replace />} />
                  <Route path="board" element={<Navigate to="../execution" replace />} />
                  <Route path="gantt" element={<Navigate to="../plan" replace />} />
                  <Route path="calendar" element={<Navigate to="../plan" replace />} />
                  <Route path="resources" element={<ProjectResourcesTab />} />
                  <Route path="change-requests" element={<Navigate to="../approvals" replace />} />
                  <Route path="budget" element={<Navigate to="../reports" replace />} />
                  <Route path="kpis" element={<Navigate to="../reports" replace />} />
                </Route>
                {/* Legacy route redirect for backwards compatibility */}
                <Route path="/work/projects/:projectId/plan" element={<ProjectPlanView />} />

                {/* Workspace canonical routes — all under WorkspaceLayout */}
                <Route path="/workspaces/:workspaceId" element={<WorkspaceLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<OperationalDashboardPage scopeType="workspace" />} />
                  <Route path="projects" element={<ProjectsPage />} />
                  <Route path="resources" element={<ResourcesPage />} />
                  <Route path="risks" element={<RisksPage />} />
                  <Route path="documents" element={<WorkspaceDocumentsPage />} />
                  <Route path="settings" element={<WorkspaceSettingsPage />} />
                  <Route path="members" element={<RequirePaidInline><WorkspaceMembersPage /></RequirePaidInline>} />
                </Route>

                {/* Legacy /workspaces/:id/home → redirect to canonical dashboard */}
                <Route path="/workspaces/:workspaceId/home" element={<WorkspaceLegacyRedirect />} />
                <Route path="/workspaces/:workspaceId/dashboards" element={<DashboardsIndex />} />
                <Route path="/workspaces/:workspaceId/dashboard/:dashboardId" element={<WorkspaceDashboardRoute />} />
                <Route path="/workspaces/:workspaceId/dashboard/:dashboardId/edit" element={<DashboardBuilder />} />
                {/* Legacy standalone members route — now inside WorkspaceLayout */}
                <Route path="/workspaces/:id/heatmap" element={<ResourceHeatmapPage />} />
                {/* PHASE 6 MODULE 3-4: Program and Portfolio routes - Gated by feature flag */}
                <Route element={<FeaturesRoute feature="programsPortfolios" />}>
                  <Route path="/workspaces/:workspaceId/programs" element={<ProgramsListPage />} />
                  <Route path="/workspaces/:workspaceId/programs/:programId" element={<ProgramDetailPage />} />
                  <Route path="/workspaces/:workspaceId/portfolios" element={<PortfoliosListPage />} />
                  <Route path="/workspaces/:workspaceId/portfolios/:portfolioId" element={<PortfolioDetailPage />} />
                </Route>
                {/* Phase 2A: /templates opens modal + redirects to /home; VIEWER blocked at route level */}
                <Route path="/templates" element={<RequirePaidInline><TemplateRouteSwitch /></RequirePaidInline>} />
                <Route path="/docs/:docId" element={<DocsPage />} />
                <Route path="/forms/:formId/edit" element={<FormsPage />} />
                <Route path="/resources" element={<ResourcesPage />} />
                <Route path="/resources/:id/timeline" element={<ResourceTimelinePage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                {/* Phase 2E: Capacity Engine */}
                <Route path="/capacity" element={<CapacityPage />} />
                {/* Phase 2F: What-If Scenarios */}
                <Route path="/scenarios" element={<ScenarioPage />} />
                {/* Paid routes - Admin and Member only */}
                <Route element={<PaidRoute />}>
                  {/* PHASE 7 MODULE 7.2: My Work */}
                  <Route path="/my-work" element={<Navigate to="/my-tasks" replace />} />
                </Route>
              </Route>
              <Route path="/403" element={<Forbidden />} />
              <Route path="/404" element={<NotFound />} />
            </Route>

          </Route>

          {/* Default redirects */}
          <Route path="/dashboards" element={<Navigate to="/home" replace />} />
          <Route path="/dashboards/:id" element={<Navigate to="/home" replace />} />
          <Route path="/dashboard" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
