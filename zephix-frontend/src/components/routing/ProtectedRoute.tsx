import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEnterpriseAuthStore } from '../../stores/enterpriseAuthStore';
import { LoadingScreen } from '../common/LoadingScreen';
import { MainLayout } from '../../layouts/MainLayout';

/**
 * ProtectedRoute Component
 * Implements comprehensive authentication protection for private routes
 * Includes token validation, session management, and proper redirects
 */
export const ProtectedRoute: React.FC = () => {
  const { 
    isAuthenticated, 
    isLoading, 
    validateSession,
    clearAuth 
  } = useEnterpriseAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Validate session on mount and route changes
    const checkSession = async () => {
      const isValid = await validateSession();
      if (!isValid) {
        clearAuth();
      }
    };

    checkSession();
  }, [location.pathname, validateSession, clearAuth]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/login" 
        replace 
        state={{ from: location, message: 'Please log in to continue' }}
      />
    );
  }

  // Render protected content within main layout
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
};
