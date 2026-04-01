import React, { Suspense } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "@/routes/ProtectedRoute";
import PaidRoute from "@/routes/PaidRoute";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { AuthProvider, useAuth } from "@/state/AuthContext";
import { platformRoleFromUser } from "@/utils/roles";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { RouteLogger } from "@/components/routing/RouteLogger";
import { lazyDefault } from "@/lib/lazyDefault";

// Auth pages — eager (critical path)
import LoginPage from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import { InvitePage } from "@/pages/auth/InvitePage";
import { VerifyEmailPage } from "@/pages/auth/VerifyEmailPage";
import { InviteAcceptPage } from "@/pages/auth/InviteAcceptPage";

// System pages — eager (lightweight, always needed)
import { NotFound } from "@/pages/system/NotFound";
import { Forbidden } from "@/pages/system/Forbidden";

// Home/navigation — eager (shown immediately after login)
import OrgHomePage from "@/pages/home/OrgHomePage";
import AdminHomePage from "@/pages/home/AdminHomePage";
import SelectWorkspacePage from "@/pages/workspaces/SelectWorkspacePage";
import GuestHomePage from "@/pages/home/GuestHomePage";
import LandingPage from "@/pages/LandingPage";
import { isStagingMarketingLandingEnabled } from "@/lib/flags";

// Route guards — eager (structural, no UI weight)
import RequireWorkspace from "@/routes/RequireWorkspace";
import FeaturesRoute from "@/routes/FeaturesRoute";
import { useWorkspaceStore } from "@/state/workspace.store";

// Public workspace routes — eager (entry points)
import JoinWorkspacePage from "@/views/workspaces/JoinWorkspacePage";
import WorkspaceSlugRedirect from "@/views/workspaces/WorkspaceSlugRedirect";
import WorkspaceHomeBySlug from "@/views/workspaces/WorkspaceHomeBySlug";

// ── Lazy-loaded feature pages (code-split) ──

const StagingMarketingLandingPage = lazyDefault(() => import("@/pages/staging/StagingMarketingLandingPage"));

// Dashboards
const DashboardsIndex = lazyDefault(() => import("@/views/dashboards/Index").then(m => ({ default: m.DashboardsIndex })));
const DashboardBuilder = lazyDefault(() => import("@/views/dashboards/Builder").then(m => ({ default: m.DashboardBuilder })));
const DashboardView = lazyDefault(() => import("@/views/dashboards/View"));

// Workspaces
const WorkspacesIndexPage = lazyDefault(() => import("@/views/workspaces/WorkspacesIndexPage"));
const WorkspaceView = lazyDefault(() => import("@/views/workspaces/WorkspaceView"));
const WorkspaceMembersPage = lazyDefault(() => import("@/features/workspaces/pages/WorkspaceMembersPage"));
const WorkspaceHomePage = lazyDefault(() => import("@/pages/workspaces/WorkspaceHomePage"));

// Projects
const ProjectsPage = lazyDefault(() => import("@/pages/projects/ProjectsPage"));
const ProjectPageLayout = lazyDefault(() => import("@/features/projects/layout").then(m => ({ default: m.ProjectPageLayout })));
const ProjectPlanView = lazyDefault(() => import("@/views/work-management/ProjectPlanView").then(m => ({ default: m.ProjectPlanView })));
const ProjectOverviewTab = lazyDefault(() => import("@/features/projects/tabs").then(m => ({ default: m.ProjectOverviewTab })));
const ProjectPlanTab = lazyDefault(() => import("@/features/projects/tabs").then(m => ({ default: m.ProjectPlanTab })));
const ProjectTasksTab = lazyDefault(() => import("@/features/projects/tabs").then(m => ({ default: m.ProjectTasksTab })));
const ProjectBoardTab = lazyDefault(() => import("@/features/projects/tabs").then(m => ({ default: m.ProjectBoardTab })));
const ProjectGanttTab = lazyDefault(() => import("@/features/projects/tabs").then(m => ({ default: m.ProjectGanttTab })));
const ProjectRisksTab = lazyDefault(() => import("@/features/projects/tabs").then(m => ({ default: m.ProjectRisksTab })));
const ProjectResourcesTab = lazyDefault(() => import("@/features/projects/tabs").then(m => ({ default: m.ProjectResourcesTab })));
const ProjectChangeRequestsTab = lazyDefault(() => import("@/features/projects/tabs").then(m => ({ default: m.ProjectChangeRequestsTab })));
const ProjectDocumentsTab = lazyDefault(() => import("@/features/projects/tabs").then(m => ({ default: m.ProjectDocumentsTab })));
const ProjectBudgetTab = lazyDefault(() => import("@/features/projects/tabs").then(m => ({ default: m.ProjectBudgetTab })));
const ProjectKpisTab = lazyDefault(() => import("@/features/projects/tabs").then(m => ({ default: m.ProjectKpisTab })));

// Templates, Docs, Forms
const TemplateRouteSwitch = lazyDefault(() => import("@/pages/templates/TemplateRouteSwitch"));
const DocsPage = lazyDefault(() => import("@/pages/docs/DocsPage"));
const FormsPage = lazyDefault(() => import("@/pages/forms/FormsPage"));

// Settings
const SettingsPage = lazyDefault(() => import("@/pages/settings/SettingsPage"));
const NotificationsSettingsPage = lazyDefault(() => import("@/pages/settings/NotificationsSettingsPage"));
const SecuritySettingsPage = lazyDefault(() => import("@/pages/settings/SecuritySettingsPage"));

// Resources
const ResourcesPage = lazyDefault(() => import("@/pages/ResourcesPage"));
const ResourceHeatmapPage = lazyDefault(() => import("@/pages/resources/ResourceHeatmapPage").then(m => ({ default: m.ResourceHeatmapPage })));
const ResourceTimelinePage = lazyDefault(() => import("@/pages/resources/ResourceTimelinePage").then(m => ({ default: m.ResourceTimelinePage })));

// Analytics, Inbox, My Work
const AnalyticsPage = lazyDefault(() => import("@/pages/AnalyticsPage"));
const InboxPage = lazyDefault(() => import("@/pages/InboxPage"));
const MyWorkPage = lazyDefault(() => import("@/pages/my-work/MyWorkPage"));

// Onboarding, Billing
const OnboardingPage = lazyDefault(() => import("@/pages/onboarding/OnboardingPage"));
const CreateFirstWorkspacePage = lazyDefault(() => import("@/pages/onboarding/CreateFirstWorkspacePage"));
const BillingPage = lazyDefault(() => import("@/pages/billing/BillingPage"));

// Capacity, Scenarios
const CapacityPage = lazyDefault(() => import("@/features/capacity/CapacityPage"));
const ScenarioPage = lazyDefault(() => import("@/features/scenarios/ScenarioPage"));

// Org Dashboard
const OrgDashboardPage = lazyDefault(() => import("@/features/org-dashboard/OrgDashboardPage"));

// Risks
const RisksPage = lazyDefault(() => import("@/features/risks/pages/RisksPage"));

// Programs & Portfolios
const ProgramsListPage = lazyDefault(() => import("@/pages/programs/ProgramsListPage"));
const ProgramDetailPage = lazyDefault(() => import("@/pages/programs/ProgramDetailPage"));
const PortfoliosListPage = lazyDefault(() => import("@/pages/portfolios/PortfoliosListPage"));
const PortfolioDetailPage = lazyDefault(() => import("@/pages/portfolios/PortfolioDetailPage"));

// Administration
const AdministrationLayout = lazyDefault(() => import("@/features/administration/layout/AdministrationLayout"));
const AdministrationOverviewPage = lazyDefault(() => import("@/features/administration/pages/AdministrationOverviewPage"));
const AdministrationGovernancePage = lazyDefault(() => import("@/features/administration/pages/AdministrationGovernancePage"));
const AdministrationWorkspacesPage = lazyDefault(() => import("@/features/administration/pages/AdministrationWorkspacesPage"));
const AdministrationTemplatesPage = lazyDefault(() => import("@/features/administration/pages/AdministrationTemplatesPage"));
const AdministrationUsersPage = lazyDefault(() => import("@/features/administration/pages/AdministrationUsersPage"));
const AdministrationAuditLogPage = lazyDefault(() => import("@/features/administration/pages/AdministrationAuditLogPage"));
const AdministrationSettingsPage = lazyDefault(() => import("@/features/administration/pages/AdministrationSettingsPage"));
const AdministrationBillingPage = lazyDefault(() => import("@/features/administration/pages/AdministrationBillingPage"));

/** "/" — authenticated users go to /home, guests see the marketing page */
function RootRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null; // wait for auth check
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

/** Canonical /home ownership by role */
function HomeRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return platformRoleFromUser(user) === "ADMIN" ? <AdminHomePage /> : <OrgHomePage />;
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
          <Route path="/join/workspace" element={<JoinWorkspacePage />} />
          {/* PROMPT 10: Workspace slug route - redirects to /w/:slug/home */}
          <Route path="/w/:slug" element={<WorkspaceSlugRedirect />} />
          {/* PHASE 5.3: Workspace home route */}
          <Route path="/w/:slug/home" element={<WorkspaceHomeBySlug />} />

          {/* Protected routes with shell */}
          <Route element={<ProtectedRoute />}>
            {/* Onboarding route (no layout) */}
            <Route path="/onboarding" element={<Suspense fallback={null}><OnboardingPage /></Suspense>} />
            <Route path="/setup/workspace" element={<Suspense fallback={null}><CreateFirstWorkspacePage /></Suspense>} />

            {/* Main app routes with DashboardLayout */}
            <Route element={
              <ErrorBoundary>
                <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading…</div>}>
                  <DashboardLayout />
                </Suspense>
              </ErrorBoundary>
            }>
              {/* ── Org-level routes (no workspace required) ── */}
              <Route path="/home" element={<HomeRoute />} />
              <Route path="/work" element={<WorkRoute />} />
              <Route path="/documents" element={<DocumentsRoute />} />
              <Route path="/select-workspace" element={<SelectWorkspacePage />} />
              <Route path="/guest/home" element={<GuestHomePage />} />
              <Route path="/workspaces" element={<WorkspacesIndexPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              {/* Phase 2A: Billing restricted to platform admin */}
              <Route path="/billing" element={<RequireAdminInline><BillingPage /></RequireAdminInline>} />
              {/* Administration control plane - admin only */}
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
              {/* Legacy admin compatibility paths */}
              <Route path="/admin" element={<RequireAdminInline><Navigate to="/administration" replace /></RequireAdminInline>} />
              <Route path="/admin/*" element={<RequireAdminInline><Navigate to="/administration" replace /></RequireAdminInline>} />
              <Route path="/org-dashboard" element={<RequireAdminInline><OrgDashboardPage /></RequireAdminInline>} />

              {/* ── Workspace-scoped routes (redirect to /home if none selected) ── */}
              <Route element={<RequireWorkspace />}>
                <Route path="/reports" element={<Navigate to="/analytics" replace />} />
                <Route path="/risks" element={<RisksPage />} />
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
                  <Route path="change-requests" element={<ProjectChangeRequestsTab />} />
                  <Route path="documents" element={<ProjectDocumentsTab />} />
                  <Route path="budget" element={<ProjectBudgetTab />} />
                  <Route path="kpis" element={<ProjectKpisTab />} />
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

          </Route>

          {/* Default redirects */}
          <Route path="/dashboard" element={<Navigate to="/dashboards" replace />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
