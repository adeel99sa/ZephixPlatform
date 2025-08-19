import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from 'react-error-boundary';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { ErrorFallback } from './components/common/ErrorFallback';

// Lazy load all page components for better performance
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage').then(module => ({ default: module.DashboardPage })));
const ProjectsPage = lazy(() => import('./pages/projects/ProjectsPage').then(module => ({ default: module.ProjectsPage })));
const AIMappingPage = lazy(() => import('./pages/ai/AIMappingPage').then(module => ({ default: module.AIMappingPage })));
const AISuggestionsPage = lazy(() => import('./pages/ai/AISuggestionsPage').then(module => ({ default: module.AISuggestionsPage })));
const WorkflowsPage = lazy(() => import('./pages/workflows/WorkflowsPage').then(module => ({ default: module.WorkflowsPage })));
const IntakeFormsPage = lazy(() => import('./pages/intake/IntakeFormsPage').then(module => ({ default: module.IntakeFormsPage })));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then(module => ({ default: module.SettingsPage })));
const TeamPage = lazy(() => import('./pages/team/TeamPage').then(module => ({ default: module.TeamPage })));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage').then(module => ({ default: module.ReportsPage })));
const TemplatesPage = lazy(() => import('./pages/templates/TemplatesPage').then(module => ({ default: module.TemplatesPage })));
const CollaborationPage = lazy(() => import('./pages/collaboration/CollaborationPage').then(module => ({ default: module.CollaborationPage })));
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(module => ({ default: module.LoginPage })));
const SignupPage = lazy(() => import('./pages/auth/SignupPage').then(module => ({ default: module.SignupPage })));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage').then(module => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage })));

// Loading component for Suspense fallback
const PageLoader: React.FC = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Router>
        {/* Skip Navigation Link for Accessibility */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-indigo-600 text-white px-4 py-2 rounded-md">
          Skip to main content
        </a>
        
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={
            <Suspense fallback={<PageLoader />}>
              <LoginPage />
            </Suspense>
          } />
          <Route path="/signup" element={
            <Suspense fallback={<PageLoader />}>
              <SignupPage />
            </Suspense>
          } />
          <Route path="/forgot-password" element={
            <Suspense fallback={<PageLoader />}>
              <ForgotPasswordPage />
            </Suspense>
          } />
          <Route path="/reset-password" element={
            <Suspense fallback={<PageLoader />}>
              <ResetPasswordPage />
            </Suspense>
          } />

          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <DashboardPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <DashboardPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/projects" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <ProjectsPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/ai/mapping" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <AIMappingPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/ai/assistant" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <AISuggestionsPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/workflows" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <WorkflowsPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/intake" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <IntakeFormsPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <SettingsPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/team" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <TeamPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <ReportsPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/templates" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <TemplatesPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/collaboration" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <CollaborationPage />
              </Suspense>
            </ProtectedRoute>
          } />

          {/* Legacy Route Redirects */}
          <Route path="/ai/suggestions" element={<Navigate to="/ai/assistant" replace />} />
          <Route path="/forms" element={<Navigate to="/intake" replace />} />

          {/* 404 Fallback */}
          <Route path="*" element={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                <p className="text-xl text-gray-600 mb-8">Page not found</p>
                <a
                  href="/"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Go to Dashboard
                </a>
              </div>
            </div>
          } />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
