import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { CommandPalette } from './components/CommandPalette';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AuthProvider } from './components/auth/AuthProvider';
import ErrorBoundary from './components/common/ErrorBoundary';
import LandingPage from './pages/LandingPage';
import { AppRoutes } from './routes';

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
            
            {/* Protected App Routes */}
            <Route path="/app/*" element={
              <ProtectedRoute>
                <AppRoutes />
              </ProtectedRoute>
            } />
            
            <Route path="/projects/*" element={
              <ProtectedRoute>
                <AppRoutes />
              </ProtectedRoute>
            } />
            
            <Route path="/tasks/*" element={
              <ProtectedRoute>
                <AppRoutes />
              </ProtectedRoute>
            } />
            
            <Route path="/resources/*" element={
              <ProtectedRoute>
                <AppRoutes />
              </ProtectedRoute>
            } />
            
            <Route path="/risks/*" element={
              <ProtectedRoute>
                <AppRoutes />
              </ProtectedRoute>
            } />
            
            <Route path="/reports/*" element={
              <ProtectedRoute>
                <AppRoutes />
              </ProtectedRoute>
            } />
            
            <Route path="/notifications/*" element={
              <ProtectedRoute>
                <AppRoutes />
              </ProtectedRoute>
            } />
            
            <Route path="/settings/*" element={
              <ProtectedRoute>
                <AppRoutes />
              </ProtectedRoute>
            } />
            
            {/* Redirect old dashboard route to new app structure */}
            <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
            
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