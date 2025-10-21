import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { DashboardLayout } from './components/layouts/DashboardLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { CommandPalette } from './components/CommandPalette';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AuthProvider } from './components/auth/AuthProvider';
import ErrorBoundary from './components/common/ErrorBoundary';
import LandingPage from './pages/LandingPage';
import { Skeleton } from './components/ui/feedback/Skeleton';

// Lazy load main dashboard pages
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ProjectsPage = lazy(() => import('./pages/projects/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('./pages/projects/ProjectDetailPage'));
const ResourcesPage = lazy(() => import('./features/resources/pages/ResourcesPage'));
const RisksPage = lazy(() => import('./features/risks/pages/RisksPage'));
const KpiCatalogPage = lazy(() => import('./features/admin/kpis/pages/KpiCatalogPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const AIMappingPage = lazy(() => import('./pages/ai/AIMappingPage').then(m => ({ default: m.AIMappingPage })));
const AISuggestionsPage = lazy(() => import('./pages/ai/AISuggestionsPage').then(m => ({ default: m.AISuggestionsPage })));
const WorkflowsPage = lazy(() => import('./pages/workflows/WorkflowsPage').then(m => ({ default: m.WorkflowsPage })));
const TemplateHubPage = lazy(() => import('./pages/templates/TemplateHubPage').then(m => ({ default: m.TemplateHubPage })));

// Loading fallback component
const PageSkeleton = () => (
  <div className="p-6 space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-4 w-96" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            
            {/* Protected Dashboard Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Suspense fallback={<PageSkeleton />}>
                    <DashboardPage />
                  </Suspense>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/projects" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Suspense fallback={<PageSkeleton />}>
                    <ProjectsPage />
                  </Suspense>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            {/* CRITICAL FIX: Use :id not :projectId */}
            <Route path="/projects/:id" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Suspense fallback={<PageSkeleton />}>
                    <ProjectDetailPage />
                  </Suspense>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/resources" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Suspense fallback={<PageSkeleton />}>
                    <ResourcesPage />
                  </Suspense>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/risks" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Suspense fallback={<PageSkeleton />}>
                    <RisksPage />
                  </Suspense>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/admin/kpis" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Suspense fallback={<PageSkeleton />}>
                    <KpiCatalogPage />
                  </Suspense>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/analytics" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Suspense fallback={<PageSkeleton />}>
                    <AnalyticsPage />
                  </Suspense>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Suspense fallback={<PageSkeleton />}>
                    <SettingsPage />
                  </Suspense>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/ai/mapping" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Suspense fallback={<PageSkeleton />}>
                    <AIMappingPage />
                  </Suspense>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/ai/suggestions" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Suspense fallback={<PageSkeleton />}>
                    <AISuggestionsPage />
                  </Suspense>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/workflows" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Suspense fallback={<PageSkeleton />}>
                    <WorkflowsPage />
                  </Suspense>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/templates" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Suspense fallback={<PageSkeleton />}>
                    <TemplateHubPage />
                  </Suspense>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            {/* Catch all - redirect to landing page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <CommandPalette />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;