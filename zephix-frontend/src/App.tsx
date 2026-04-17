import React from "react";
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from "react-router-dom";

import ProtectedRoute from "@/routes/ProtectedRoute";
import PaidRoute from "@/routes/PaidRoute";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { AuthProvider, useAuth } from "@/state/AuthContext";
import { platformRoleFromUser, PLATFORM_ROLE } from "@/utils/roles";
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
import { FolderInput, Plug, Trash2 } from "lucide-react";
import AdministrationLayout from "@/features/administration/layout/AdministrationLayout";
import AdministrationOverviewPage from "@/features/administration/pages/AdministrationOverviewPage";
import AdministrationGovernancePage from "@/features/administration/pages/AdministrationGovernancePage";
import AdministrationTemplatesPage from "@/features/administration/pages/AdministrationTemplatesPage";
import AdministrationPeoplePage from "@/features/administration/pages/AdministrationPeoplePage";
import AdministrationSecurityPage from "@/features/administration/pages/AdministrationSecurityPage";
import AdministrationOrganizationPage from "@/features/administration/pages/AdministrationOrganizationPage";
import AdministrationTeamsPage from "@/features/administration/pages/AdministrationTeamsPage";
import AdministrationNotificationsPage from "@/features/administration/pages/AdministrationNotificationsPage";
import AdministrationAuditTrailPage from "@/features/administration/pages/AdministrationAuditTrailPage";
import AdministrationBillingPage from "@/features/administration/pages/AdministrationBillingPage";
import AdministrationGeneralPage from "@/features/administration/pages/AdministrationGeneralPage";
import AdministrationComingSoonPage from "@/features/administration/pages/AdministrationComingSoonPage";
import AdminProfilePage from "@/features/administration/pages/AdminProfilePage";
import AdminPreferencesPage from "@/features/administration/pages/AdminPreferencesPage";
import AppAuthenticatedChrome from "@/components/shell/AppAuthenticatedChrome";
import { UserThemeSync } from "@/components/system/UserThemeSync";
// RisksPage retired — risks live inside projects (/projects/:id/risks)
import { useWorkspaceStore } from "@/state/workspace.store";
import { clearUserSelectLock } from "@/lib/dom/clearUserSelectLock";

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

function isPlatformAdminUser(user: ReturnType<typeof useAuth>["user"]): boolean {
  if (!user) return false;
  return (
    platformRoleFromUser(user) === PLATFORM_ROLE.ADMIN ||
    (!Array.isArray(user.permissions) && (user.permissions as { isAdmin?: boolean } | undefined)?.isAdmin === true)
  );
}

/** /administration index: admins see overview; other roles land on personal profile. */
function AdministrationIndexRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (isPlatformAdminUser(user)) return <AdministrationOverviewPage />;
  return <Navigate to="/administration/profile" replace />;
}

function DndUserSelectCleanup() {
  const location = useLocation();

  React.useEffect(() => {
    clearUserSelectLock();
  }, []);

  React.useEffect(() => {
    const clear = () => clearUserSelectLock();
    clear();

    window.addEventListener("dragend", clear);
    window.addEventListener("mouseup", clear);
    window.addEventListener("pointerup", clear);
    window.addEventListener("touchend", clear);
    window.addEventListener("visibilitychange", clear);
    window.addEventListener("blur", clear);
    window.addEventListener("focus", clear);
    window.addEventListener("keyup", clear);

    return () => {
      window.removeEventListener("dragend", clear);
      window.removeEventListener("mouseup", clear);
      window.removeEventListener("pointerup", clear);
      window.removeEventListener("touchend", clear);
      window.removeEventListener("visibilitychange", clear);
      window.removeEventListener("blur", clear);
      window.removeEventListener("focus", clear);
      window.removeEventListener("keyup", clear);
      clear();
    };
  }, [location.pathname]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <UserThemeSync />
        <RouteLogger />
        <DndUserSelectCleanup />
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
            <Route element={<AppAuthenticatedChrome />}>
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
              <Route path="/settings" element={<Navigate to="/administration/profile" replace />} />
              <Route path="/settings/profile" element={<Navigate to="/administration/profile" replace />} />
              <Route
                path="/settings/notifications"
                element={<Navigate to="/administration/notifications" replace />}
              />
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
                  <Route path="/settings/security" element={<SecuritySettingsPage />} />
                </Route>
              </Route>
              <Route path="/403" element={<Forbidden />} />
              <Route path="/404" element={<NotFound />} />
            </Route>

            {/*
             * Administration shell — sibling of DashboardLayout. Any authenticated
             * user may open personal settings; platform admin sections use
             * RequireAdminInline on each route.
             */}
            <Route path="/administration" element={<AdministrationLayout />}>
              <Route index element={<AdministrationIndexRoute />} />
              <Route path="profile" element={<AdminProfilePage />} />
              <Route path="preferences" element={<AdminPreferencesPage />} />
              <Route path="notifications" element={<AdministrationNotificationsPage />} />
              <Route path="general" element={<RequireAdminInline><AdministrationGeneralPage /></RequireAdminInline>} />
              <Route path="governance" element={<RequireAdminInline><AdministrationGovernancePage /></RequireAdminInline>} />
              <Route
                path="workspaces"
                element={<RequireAdminInline><Navigate to="/administration?workspaces=1" replace /></RequireAdminInline>}
              />
              <Route path="templates" element={<RequireAdminInline><AdministrationTemplatesPage /></RequireAdminInline>} />
              <Route path="people" element={<RequireAdminInline><AdministrationPeoplePage /></RequireAdminInline>} />
              <Route path="security" element={<RequireAdminInline><AdministrationSecurityPage /></RequireAdminInline>} />
              <Route path="organization" element={<RequireAdminInline><AdministrationOrganizationPage /></RequireAdminInline>} />
              <Route path="teams" element={<RequireAdminInline><AdministrationTeamsPage /></RequireAdminInline>} />
              <Route path="audit-trail" element={<RequireAdminInline><AdministrationAuditTrailPage /></RequireAdminInline>} />
              <Route path="billing" element={<RequireAdminInline><AdministrationBillingPage /></RequireAdminInline>} />
              <Route
                path="import-export"
                element={
                  <RequireAdminInline>
                    <AdministrationComingSoonPage
                      title="Import / Export"
                      description="Bulk import and export for projects, tasks, and users will be available here."
                      icon={FolderInput}
                      testId="admin-import-export"
                    />
                  </RequireAdminInline>
                }
              />
              <Route
                path="integrations"
                element={
                  <RequireAdminInline>
                    <AdministrationComingSoonPage
                      title="Integrations"
                      description="Connect Slack, webhooks, identity providers, and other systems from this console."
                      icon={Plug}
                      testId="admin-integrations"
                    />
                  </RequireAdminInline>
                }
              />
              <Route
                path="trash"
                element={
                  <RequireAdminInline>
                    <AdministrationComingSoonPage
                      title="Trash"
                      description="Recently deleted workspaces, projects, and tasks will be recoverable from Trash."
                      icon={Trash2}
                      testId="admin-trash"
                    />
                  </RequireAdminInline>
                }
              />
              <Route path="users" element={<RequireAdminInline><Navigate to="/administration/people" replace /></RequireAdminInline>} />
              <Route path="audit-log" element={<RequireAdminInline><Navigate to="/administration/audit-trail" replace /></RequireAdminInline>} />
              <Route path="settings" element={<RequireAdminInline><Navigate to="/administration/security" replace /></RequireAdminInline>} />
            </Route>
            <Route path="/admin" element={<Navigate to="/administration" replace />} />
            <Route path="/admin/*" element={<Navigate to="/administration" replace />} />

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
