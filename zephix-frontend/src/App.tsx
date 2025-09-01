// src/App.tsx (replace the entire file)
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { ProjectsPage } from '@/pages/projects/ProjectsPage';
import { ResourcesPage } from '@/pages/ResourcesPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { AIMappingPage } from '@/pages/ai/AIMappingPage';
import { AISuggestionsPage } from '@/pages/ai/AISuggestionsPage';
import { WorkflowsPage } from '@/pages/workflows/WorkflowsPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import LandingPage from '@/pages/LandingPage';

function App() {
  return (
    <ErrorBoundary>
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
                <DashboardPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/projects" element={
            <ProtectedRoute requiredPermission="canViewProjects">
              <DashboardLayout>
                <ProjectsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/resources" element={
            <ProtectedRoute requiredPermission="canManageResources">
              <DashboardLayout>
                <ResourcesPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/analytics" element={
            <ProtectedRoute requiredPermission="canViewAnalytics">
              <DashboardLayout>
                <AnalyticsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <ProtectedRoute requiredPermission="isAdmin">
              <DashboardLayout>
                <SettingsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/ai/mapping" element={
            <ProtectedRoute requiredPermission="canViewProjects">
              <DashboardLayout>
                <AIMappingPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/ai/suggestions" element={
            <ProtectedRoute requiredPermission="canViewProjects">
              <DashboardLayout>
                <AISuggestionsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/workflows" element={
            <ProtectedRoute requiredPermission="canViewProjects">
              <DashboardLayout>
                <WorkflowsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;