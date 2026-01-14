import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/routes/ProtectedRoute";
import AdminRoute from "@/routes/AdminRoute";
import PaidRoute from "@/routes/PaidRoute";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AuthProvider } from "@/state/AuthContext";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { RouteLogger } from "@/components/routing/RouteLogger";

// Auth pages
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import { InvitePage } from "@/pages/auth/InvitePage";
import { VerifyEmailPage } from "@/pages/auth/VerifyEmailPage";
import { InviteAcceptPage } from "@/pages/auth/InviteAcceptPage";

// System pages
import { NotFound } from "@/pages/system/NotFound";
import { Forbidden } from "@/pages/system/Forbidden";

// Views
import { HomeView } from "@/views/HomeView";
import { DashboardsIndex } from "@/views/dashboards/Index";
import { DashboardBuilder } from "@/views/dashboards/Builder";
import DashboardView from "@/views/dashboards/View";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import WorkspacesIndexPage from "@/views/workspaces/WorkspacesIndexPage";
import WorkspaceView from "@/views/workspaces/WorkspaceView";
import WorkspaceMembersPage from "@/features/workspaces/pages/WorkspaceMembersPage";
import { TemplateCenter } from "@/views/templates/TemplateCenter";
import { ProjectPlanView } from "@/views/work-management/ProjectPlanView";
import { ProjectOverviewPage } from "@/features/projects/overview/ProjectOverviewPage";
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
import { JoinWorkspacePage } from "@/views/workspaces/JoinWorkspacePage";
import WorkspaceSlugRedirect from "@/views/workspaces/WorkspaceSlugRedirect";
import WorkspaceHomeBySlug from "@/views/workspaces/WorkspaceHomeBySlug";
// PHASE 6 MODULE 3-4: Program and Portfolio pages
import ProgramsListPage from "@/pages/programs/ProgramsListPage";
import ProgramDetailPage from "@/pages/programs/ProgramDetailPage";
import PortfoliosListPage from "@/pages/portfolios/PortfoliosListPage";
import PortfolioDetailPage from "@/pages/portfolios/PortfolioDetailPage";
// PHASE 7 MODULE 7.2: My Work
import MyWorkPage from "@/pages/my-work/MyWorkPage";

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

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <RouteLogger />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
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
              <Route path="/home" element={<HomeView />} />
              <Route path="/dashboards" element={<DashboardsIndex />} />
              <Route path="/dashboards/:id" element={<DashboardView />} />
              <Route path="/dashboards/:id/edit" element={<DashboardBuilder />} />
              <Route path="/projects" element={<div>Projects Page</div>} />
              <Route path="/projects/:projectId" element={<ProjectOverviewPage />} />
              <Route path="/work/projects/:projectId/plan" element={<ProjectPlanView />} />
              <Route path="/workspaces" element={<WorkspacesIndexPage />} />
              <Route path="/workspaces/:id" element={<WorkspaceView />} />
              <Route path="/workspaces/:id/members" element={<WorkspaceMembersPage />} />
              <Route path="/workspaces/:id/settings" element={<div>Workspace Settings</div>} />
              <Route path="/workspaces/:id/heatmap" element={<ResourceHeatmapPage />} />
              {/* PHASE 6 MODULE 3-4: Program and Portfolio routes */}
              <Route path="/workspaces/:workspaceId/programs" element={<ProgramsListPage />} />
              <Route path="/workspaces/:workspaceId/programs/:programId" element={<ProgramDetailPage />} />
              <Route path="/workspaces/:workspaceId/portfolios" element={<PortfoliosListPage />} />
              <Route path="/workspaces/:workspaceId/portfolios/:portfolioId" element={<PortfolioDetailPage />} />
              <Route path="/templates" element={<TemplateCenter />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/resources/:id/timeline" element={<ResourceTimelinePage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              {/* Paid routes - Admin and Member only */}
              <Route element={<PaidRoute />}>
                <Route path="/settings/notifications" element={<NotificationsSettingsPage />} />
                <Route path="/settings/security" element={<SecuritySettingsPage />} />
                <Route path="/inbox" element={<InboxPage />} />
                {/* PHASE 7 MODULE 7.2: My Work */}
                <Route path="/my-work" element={<MyWorkPage />} />
              </Route>
              <Route path="/billing" element={<BillingPage />} />
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
                <Route path="/admin/overview" element={<AdminOverviewPage />} />

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
