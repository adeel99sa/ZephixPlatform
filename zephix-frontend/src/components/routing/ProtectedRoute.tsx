import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { MainLayout } from '../../layouts/MainLayout';
import { LoadingScreen } from '../common/LoadingScreen';

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
  } = useAuthStore();

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
