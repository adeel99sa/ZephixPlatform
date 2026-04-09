import React from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "@/routes/ProtectedRoute";
import PaidRoute from "@/routes/PaidRoute";
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
import RequireWorkspace from "@/routes/RequireWorkspace";
import { DashboardsIndex } from "@/views/dashboards/Index";
import { DashboardBuilder } from "@/views/dashboards/Builder";
import DashboardView from "@/views/dashboards/View";
import WorkspacesIndexPage from "@/views/workspaces/WorkspacesIndexPage";
import WorkspaceView from "@/views/workspaces/WorkspaceView";
import WorkspaceMembersPage from "@/features/workspaces/pages/WorkspaceMembersPage";
import WorkspaceSettingsPage from "@/features/workspaces/settings/WorkspaceSettingsPage";
import WorkspaceHomePage from "@/pages/workspaces/WorkspaceHomePage";
import TemplateRouteSwitch from "@/pages/templates/TemplateRouteSwitch";
import DocsPage from "@/pages/docs/DocsPage";
import FormsPage from "@/pages/forms/FormsPage";
import { ProjectPlanView } from "@/views/work-management/ProjectPlanView";
import { ProjectPageLayout } from "@/features/projects/layout";
import { ProjectOverviewTab, ProjectTasksTab, ProjectBoardTab, ProjectGanttTab } from "@/features/projects/tabs";
import { NotEnabledInProject } from "@/features/projects/components/NotEnabledInProject";
import ProjectsPage from "@/pages/projects/ProjectsPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import NotificationsSettingsPage from "@/pages/settings/NotificationsSettingsPage";
import SecuritySettingsPage from "@/pages/settings/SecuritySettingsPage";
import InboxPage from "@/pages/InboxPage";
import ResourcesPage from "@/pages/ResourcesPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import OnboardingPage from "@/pages/onboarding/OnboardingPage";
import { OnboardingGuard } from "@/pages/onboarding/OnboardingGuard";
import BillingPage from "@/pages/billing/BillingPage";
import LandingPage from "@/pages/LandingPage";
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
import AdministrationGovernancePage from "@/features/administration/pages/AdministrationGovernancePage";
import AdministrationWorkspacesPage from "@/features/administration/pages/AdministrationWorkspacesPage";
import AdministrationTemplatesPage from "@/features/administration/pages/AdministrationTemplatesPage";
import AdministrationUsersPage from "@/features/administration/pages/AdministrationUsersPage";
import AdministrationAuditLogPage from "@/features/administration/pages/AdministrationAuditLogPage";
import AdministrationSettingsPage from "@/features/administration/pages/AdministrationSettingsPage";
import AdministrationBillingPage from "@/features/administration/pages/AdministrationBillingPage";
// RisksPage retired — risks live inside projects (/projects/:id/risks)
import { useWorkspaceStore } from "@/state/workspace.store";

/** "/" — authenticated users go to Inbox (inbox-first); guests see the marketing page */
function RootRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null; // wait for auth check
  if (user) return <Navigate to="/inbox" replace />;
  if (isStagingMarketingLandingEnabled()) {
    return (
      <React.Suspense fallback={null}>
        <StagingMarketingLandingPage />
      </React.Suspense>
    );
  }
  return <LandingPage />;
}

/** /home is retired — Inbox is the landing page for all roles. Redirect so old links still work. */
function HomeRoute() {
  return <Navigate to="/inbox" replace />;
}

/** Primary "Work" route: workspace-aware entrypoint */
function WorkRoute() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  if (activeWorkspaceId) return <Navigate to="/projects" replace />;
  return <Navigate to="/workspaces" replace />;
}

/** Documents entry for current IA; routes into Work context */
function DocumentsRoute() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  if (activeWorkspaceId) return <Navigate to={`/workspaces/${activeWorkspaceId}/home`} replace />;
  return <Navigate to="/workspaces" replace />;
}

/**
 * Phase 2A: Inline admin-only route guard for routes outside AdminLayout
 * (e.g. /billing). Redirects non-admins to /home.
 */
function RequireAdminInline({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  const isAdmin =
    platformRoleFromUser(user) === 'ADMIN' ||
    (!Array.isArray(user.permissions) && (user.permissions as any)?.isAdmin === true);
  if (!isAdmin) return <Navigate to="/inbox" replace />;
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
  if (platformRoleFromUser(user) === 'VIEWER') return <Navigate to="/inbox" replace />;
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
            <Route path="/onboarding" element={<OnboardingGuard><OnboardingPage /></OnboardingGuard>} />
            <Route path="/setup/workspace" element={<Navigate to="/onboarding" replace />} />

            {/* Main app routes with DashboardLayout */}
            <Route element={
              <ErrorBoundary>
                <DashboardLayout />
              </ErrorBoundary>
            }>
              {/* ── Org-level routes (no workspace required) ── */}
              {/* Inbox-first: all roles land here after login */}
              <Route path="/inbox" element={<InboxPage />} />
              <Route path="/home" element={<HomeRoute />} />
              <Route path="/work" element={<WorkRoute />} />
              <Route path="/documents" element={<DocumentsRoute />} />
              <Route path="/select-workspace" element={<SelectWorkspacePage />} />
              <Route path="/guest/home" element={<GuestHomePage />} />
              <Route path="/workspaces" element={<WorkspacesIndexPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/profile" element={<Navigate to="/settings" replace />} />
              {/* Phase 2A: Billing restricted to platform admin */}
              <Route path="/billing" element={<RequireAdminInline><BillingPage /></RequireAdminInline>} />
              <Route path="/org-dashboard" element={<RequireAdminInline><OrgDashboardPage /></RequireAdminInline>} />

              {/* Pass 3: Dashboards directory — Org Admin only. Still workspace-dependent for listing/creation. */}
              <Route path="/dashboards" element={<RequireAdminInline><DashboardsIndex /></RequireAdminInline>} />

              {/* My Work — org-level queue; paid Admin/Member only; no active workspace required */}
              <Route element={<PaidRoute />}>
                <Route path="/my-work" element={<MyWorkPage />} />
              </Route>

              {/* ── Workspace-scoped routes (redirect to /inbox if none selected) ── */}
              <Route element={<RequireWorkspace />}>
                <Route path="/reports" element={<Navigate to="/analytics" replace />} />
                {/* Phase 2D: /risks standalone page retired — risks live inside projects. Use /projects/:id/risks */}
                <Route path="/risks" element={<Navigate to="/workspaces" replace />} />
                <Route path="/dashboards/:id" element={<DashboardView />} />
                <Route path="/dashboards/:id/edit" element={<DashboardBuilder />} />
                <Route path="/projects" element={<ProjectsPage />} />
                {/* Project detail pages with tabbed layout */}
                {/* Phase 2 (Template Center HR3): Only 4 tabs are visible. Hidden tabs render NotEnabledInProject. */}
                <Route path="/projects/:projectId" element={<ProjectPageLayout />}>
                  <Route index element={<ProjectOverviewTab />} />
                  <Route path="tasks" element={<ProjectTasksTab />} />
                  <Route path="board" element={<ProjectBoardTab />} />
                  <Route path="gantt" element={<ProjectGanttTab />} />
                  {/* Hidden tabs — show controlled "not enabled" state */}
                  <Route path="plan" element={<NotEnabledInProject featureName="Plan" description="Phase planning view will return when work breakdown structure UX is finalized." />} />
                  <Route path="table" element={<NotEnabledInProject featureName="Table view" description="Spreadsheet-style task editing is not part of the MVP project shell." />} />
                  <Route path="risks" element={<NotEnabledInProject featureName="Risks" description="The Risk Management Engine is on the platform roadmap and is not active in the MVP shell." />} />
                  <Route path="resources" element={<NotEnabledInProject featureName="Resources" description="The Resource & Capacity Management Engine is on the platform roadmap and is not active in the MVP shell." />} />
                  <Route path="change-requests" element={<NotEnabledInProject featureName="Change Requests" description="Change request governance is on the platform roadmap." />} />
                  <Route path="documents" element={<NotEnabledInProject featureName="Documents" description="Project document management is on the platform roadmap." />} />
                  <Route path="budget" element={<NotEnabledInProject featureName="Budget" description="Budget tracking is part of the Governance Engine roadmap." />} />
                  <Route path="kpis" element={<NotEnabledInProject featureName="KPIs" description="Project-level KPI tracking is part of the Governance Engine roadmap." />} />
                </Route>
                {/* Legacy route redirect for backwards compatibility */}
                <Route path="/work/projects/:projectId/plan" element={<ProjectPlanView />} />
                <Route path="/workspaces/:workspaceId/home" element={<WorkspaceHomePage />} />
                <Route path="/workspaces/:id" element={<WorkspaceView />} />
                {/* Phase 2A: Members page blocked for VIEWER at route level */}
                <Route path="/workspaces/:id/members" element={<RequirePaidInline><WorkspaceMembersPage /></RequirePaidInline>} />
                <Route path="/workspaces/:id/settings" element={<WorkspaceSettingsPage />} />
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
                </Route>
              </Route>
              <Route path="/403" element={<Forbidden />} />
              <Route path="/404" element={<NotFound />} />
            </Route>

            {/*
             * Administration control plane — full-page layout (Admin Console MVP-1).
             * Per Admin Console Architecture Spec v1 §4.1: when the user enters
             * Administration, the main app sidebar disappears and the admin
             * sidebar takes the full left panel. This route is a SIBLING of
             * DashboardLayout (NOT nested inside it) so AdministrationLayout
             * is the only layout in the tree, replacing the main app shell.
             *
             * Still inside ProtectedRoute so unauthenticated users are bounced
             * to /login. Still gated by RequireAdminInline so only platform
             * ADMIN users can reach it (matches the backend AdminGuard which
             * also checks normalizePlatformRole(...) === ADMIN).
             *
             * Legacy /admin and /admin/* paths redirect to /administration.
             * They live here as siblings (not under DashboardLayout) so the
             * redirect target is reachable from the same shell-less context.
             */}
            <Route path="/administration" element={<RequireAdminInline><AdministrationLayout /></RequireAdminInline>}>
              <Route index element={<AdministrationOverviewPage />} />
              <Route path="governance" element={<AdministrationGovernancePage />} />
              <Route path="workspaces" element={<AdministrationWorkspacesPage />} />
              <Route path="templates" element={<AdministrationTemplatesPage />} />
              <Route path="users" element={<AdministrationUsersPage />} />
              <Route path="audit-log" element={<AdministrationAuditLogPage />} />
              <Route path="settings" element={<AdministrationSettingsPage />} />
              <Route path="billing" element={<AdministrationBillingPage />} />
            </Route>
            {/* Legacy admin compatibility paths — also outside DashboardLayout. */}
            <Route path="/admin" element={<RequireAdminInline><Navigate to="/administration" replace /></RequireAdminInline>} />
            <Route path="/admin/*" element={<RequireAdminInline><Navigate to="/administration" replace /></RequireAdminInline>} />

          </Route>

          {/* Default redirects */}
          <Route path="/dashboard" element={<Navigate to="/dashboards" replace />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
