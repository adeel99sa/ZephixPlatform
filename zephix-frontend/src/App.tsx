import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/layouts/DashboardLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import ProjectDetailPage from './pages/projects/ProjectDetailPage';
import ResourcesPage from './pages/ResourcesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { AIMappingPage } from './pages/ai/AIMappingPage';
import { AISuggestionsPage } from './pages/ai/AISuggestionsPage';
import { WorkflowsPage } from './pages/workflows/WorkflowsPage';
import { TemplateHubPage } from './pages/templates/TemplateHubPage';
import { CommandPalette } from './components/CommandPalette';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AuthProvider } from './components/auth/AuthProvider';
import ErrorBoundary from './components/common/ErrorBoundary';
import LandingPage from './pages/LandingPage';

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
                  <DashboardPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/projects" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProjectsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            {/* CRITICAL FIX: Use :id not :projectId */}
            <Route path="/projects/:id" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProjectDetailPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/resources" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ResourcesPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/analytics" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AnalyticsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SettingsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/ai/mapping" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AIMappingPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/ai/suggestions" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AISuggestionsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/workflows" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <WorkflowsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/templates" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <TemplateHubPage />
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