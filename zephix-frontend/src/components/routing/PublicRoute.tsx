import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { LoadingScreen } from '../common/LoadingScreen';

/**
 * PublicRoute Component
 * Handles routing logic for public pages (landing, login, signup)
 * Redirects authenticated users away from auth pages to dashboard
 */
export const PublicRoute: React.FC = () => {
  const { isAuthenticated, isLoading, isHydrated } = useAuthStore();

  // Show loading screen while checking authentication status or before hydration
  if (isLoading || !isHydrated) {
    return <LoadingScreen />;
  }

  // List of auth pages that authenticated users shouldn't access
  const authPages = ['/login', '/signup', '/forgot-password'];
  const isAuthPage = authPages.some(page => location.pathname.startsWith(page));

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isAuthPage) {
    const from = location.state?.from?.pathname || '/hub';
    return <Navigate to={from} replace />;
  }

  // Render the public route
  return <Outlet />;
};
