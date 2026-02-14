import React from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "@/routes/ProtectedRoute";
import AdminRoute from "@/routes/AdminRoute";
import PaidRoute from "@/routes/PaidRoute";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AuthProvider, useAuth } from "@/state/AuthContext";
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
import OrgHomePage from "@/pages/home/OrgHomePage";
import SelectWorkspacePage from "@/pages/workspaces/SelectWorkspacePage";
import GuestHomePage from "@/pages/home/GuestHomePage";
import RequireWorkspace from "@/routes/RequireWorkspace";
import { DashboardsIndex } from "@/views/dashboards/Index";
import { DashboardBuilder } from "@/views/dashboards/Builder";
import DashboardView from "@/views/dashboards/View";
import WorkspacesIndexPage from "@/views/workspaces/WorkspacesIndexPage";
import WorkspaceView from "@/views/workspaces/WorkspaceView";
import WorkspaceMembersPage from "@/features/workspaces/pages/WorkspaceMembersPage";
import WorkspaceHomePage from "@/pages/workspaces/WorkspaceHomePage";
import TemplateRouteSwitch from "@/pages/templates/TemplateRouteSwitch";
import DocsPage from "@/pages/docs/DocsPage";
import FormsPage from "@/pages/forms/FormsPage";
import { ProjectPlanView } from "@/views/work-management/ProjectPlanView";
import { ProjectPageLayout } from "@/features/projects/layout";
import { ProjectOverviewTab, ProjectPlanTab, ProjectTasksTab, ProjectBoardTab, ProjectGanttTab, ProjectRisksTab, ProjectResourcesTab } from "@/features/projects/tabs";
import ProjectsPage from "@/pages/projects/ProjectsPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import NotificationsSettingsPage from "@/pages/settings/NotificationsSettingsPage";
import SecuritySettingsPage from "@/pages/settings/SecuritySettingsPage";
import InboxPage from "@/pages/InboxPage";
import ResourcesPage from "@/pages/ResourcesPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import OnboardingPage from "@/pages/onboarding/OnboardingPage";
import BillingPage from "@/pages/billing/BillingPage";
import LandingPage from "@/pages/LandingPage";
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

// Admin pages
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminOrganizationPage from "@/pages/admin/AdminOrganizationPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminTeamsPage from "@/pages/admin/AdminTeamsPage";
import AdminRolesPage from "@/pages/admin/AdminRolesPage";
import AdminInvitePage from "@/pages/admin/AdminInvitePage";
import AdminTemplatesPage from "@/pages/admin/AdminTemplatesPage";
import AdminWorkspacesPage from "@/pages/admin/AdminWorkspacesPage";
import AdminProjectsPage from "@/pages/admin/AdminProjectsPage";
import AdminArchivePage from "@/pages/admin/AdminArchivePage";
import AdminTrashPage from "@/pages/admin/AdminTrashPage";
import AdminBillingPage from "@/pages/admin/AdminBillingPage";
import AdminUsagePage from "@/pages/admin/AdminUsagePage";
import AdminSecurityPage from "@/pages/admin/AdminSecurityPage";
import AdminTemplateBuilderPage from "@/pages/admin/AdminTemplateBuilderPage";
import AdminCustomFieldsPage from "@/pages/admin/AdminCustomFieldsPage";
import AdminOverviewPage from "@/pages/admin/AdminOverviewPage";

/** "/" — authenticated users go to /home, guests see the marketing page */
function RootRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null; // wait for auth check
  if (user) return <Navigate to="/home" replace />;
  return <LandingPage />;
}

/**
 * Phase 2A: Inline admin-only route guard for routes outside AdminLayout
 * (e.g. /billing). Redirects non-admins to /home.
 */
function RequireAdminInline({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  const role = (user.platformRole || user.role || '').toUpperCase();
  const isAdmin =
    role === 'ADMIN' ||
    (!Array.isArray(user.permissions) && (user.permissions as any)?.isAdmin === true);
  if (!isAdmin) return <Navigate to="/home" replace />;
  return children;
}

/**
 * Phase 2A: Inline paid-user guard — blocks VIEWER (guest) from accessing
 * routes that require Admin or Member role (e.g. /templates, /workspaces/:id/members).
 */
function RequirePaidInline({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  const role = (user.platformRole || user.role || '').toUpperCase();
  if (role === 'VIEWER' || role === 'GUEST') return <Navigate to="/home" replace />;
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
          <Route path="/join/workspace" element={<JoinWorkspacePage />} />
          {/* PROMPT 10: Workspace slug route - redirects to /w/:slug/home */}
          <Route path="/w/:slug" element={<WorkspaceSlugRedirect />} />
          {/* PHASE 5.3: Workspace home route */}
          <Route path="/w/:slug/home" element={<WorkspaceHomeBySlug />} />

          {/* Protected routes with shell */}
          <Route element={<ProtectedRoute />}>
            {/* Onboarding route (no layout) */}
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* Main app routes with DashboardLayout */}
            <Route element={
              <ErrorBoundary>
                <DashboardLayout />
              </ErrorBoundary>
            }>
              {/* ── Org-level routes (no workspace required) ── */}
              <Route path="/home" element={<OrgHomePage />} />
              <Route path="/select-workspace" element={<SelectWorkspacePage />} />
              <Route path="/guest/home" element={<GuestHomePage />} />
              <Route path="/workspaces" element={<WorkspacesIndexPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              {/* Phase 2A: Billing restricted to platform admin */}
              <Route path="/billing" element={<RequireAdminInline><BillingPage /></RequireAdminInline>} />

              {/* ── Workspace-scoped routes (redirect to /home if none selected) ── */}
              <Route element={<RequireWorkspace />}>
                <Route path="/dashboards" element={<DashboardsIndex />} />
                <Route path="/dashboards/:id" element={<DashboardView />} />
                <Route path="/dashboards/:id/edit" element={<DashboardBuilder />} />
                <Route path="/projects" element={<ProjectsPage />} />
                {/* Project detail pages with tabbed layout */}
                <Route path="/projects/:projectId" element={<ProjectPageLayout />}>
                  <Route index element={<ProjectOverviewTab />} />
                  <Route path="plan" element={<ProjectPlanTab />} />
                  <Route path="tasks" element={<ProjectTasksTab />} />
                  <Route path="board" element={<ProjectBoardTab />} />
                  <Route path="gantt" element={<ProjectGanttTab />} />
                  <Route path="risks" element={<ProjectRisksTab />} />
                  <Route path="resources" element={<ProjectResourcesTab />} />
                </Route>
                {/* Legacy route redirect for backwards compatibility */}
                <Route path="/work/projects/:projectId/plan" element={<ProjectPlanView />} />
                <Route path="/workspaces/:workspaceId/home" element={<WorkspaceHomePage />} />
                <Route path="/workspaces/:id" element={<WorkspaceView />} />
                {/* Phase 2A: Members page blocked for VIEWER at route level */}
                <Route path="/workspaces/:id/members" element={<RequirePaidInline><WorkspaceMembersPage /></RequirePaidInline>} />
                {/* Phase 2A: Workspace settings stub replaced with redirect to workspace home */}
                <Route path="/workspaces/:id/settings" element={<Navigate to=".." replace />} />
                <Route path="/workspaces/:id/heatmap" element={<ResourceHeatmapPage />} />
                {/* PHASE 6 MODULE 3-4: Program and Portfolio routes - Gated by feature flag */}
                <Route element={<FeaturesRoute feature="programsPortfolios" />}>
                  <Route path="/workspaces/:workspaceId/programs" element={<ProgramsListPage />} />
                  <Route path="/workspaces/:workspaceId/programs/:programId" element={<ProgramDetailPage />} />
                  <Route path="/workspaces/:workspaceId/portfolios" element={<PortfoliosListPage />} />
                  <Route path="/workspaces/:workspaceId/portfolios/:portfolioId" element={<PortfolioDetailPage />} />
                </Route>
                {/* Phase 2A: Templates blocked for VIEWER at route level */}
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
                  <Route path="/settings/notifications" element={<NotificationsSettingsPage />} />
                  <Route path="/settings/security" element={<SecuritySettingsPage />} />
                  <Route path="/inbox" element={<InboxPage />} />
                  {/* PHASE 7 MODULE 7.2: My Work */}
                  <Route path="/my-work" element={<MyWorkPage />} />
                </Route>
              </Route>
              <Route path="/403" element={<Forbidden />} />
              <Route path="/404" element={<NotFound />} />
            </Route>

            {/* Admin routes with AdminLayout (separate from main app) */}
            <Route element={<AdminRoute />}>
              <Route element={
                <ErrorBoundary>
                  <AdminLayout />
                </ErrorBoundary>
              }>
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/home" element={<AdminDashboardPage />} />
                <Route path="/admin/overview" element={<AdminOverviewPage />} />
                <Route path="/org-dashboard" element={<OrgDashboardPage />} />

                {/* Organization Section */}
                <Route path="/admin/org" element={<AdminOrganizationPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/teams" element={<AdminTeamsPage />} />
                <Route path="/admin/roles" element={<AdminRolesPage />} />
                <Route path="/admin/invite" element={<AdminInvitePage />} />
                <Route path="/admin/usage" element={<AdminUsagePage />} />
                <Route path="/admin/billing" element={<AdminBillingPage />} />
                <Route path="/admin/security" element={<AdminSecurityPage />} />

                {/* Templates Section */}
                <Route path="/admin/templates" element={<AdminTemplatesPage />} />
                <Route path="/admin/templates/builder" element={<AdminTemplateBuilderPage />} />
                <Route path="/admin/templates/custom-fields" element={<AdminCustomFieldsPage />} />

                {/* Workspaces & Projects Section */}
                <Route path="/admin/workspaces" element={<AdminWorkspacesPage />} />
                <Route path="/admin/projects" element={<AdminProjectsPage />} />
                <Route path="/admin/archive" element={<AdminArchivePage />} />
                <Route path="/admin/trash" element={<AdminTrashPage />} />
              </Route>
            </Route>
          </Route>

          {/* Default redirects */}
          <Route path="/dashboard" element={<Navigate to="/dashboards" replace />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
