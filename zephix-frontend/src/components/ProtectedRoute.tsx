import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { useAuthStore } from '../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const verifyAuth = async () => {
      if (!isAuthenticated && !authChecked) {
        try {
          const isValid = await checkAuth();
          setAuthChecked(true);
          if (!isValid) {
            // Only redirect if we're not already on the login page
            if (!location.pathname.includes('/login')) {
              window.location.href = `/login?redirect=${encodeURIComponent(location.pathname)}`;
            }
            return;
          }
        } catch (error) {
          console.error('Auth verification failed:', error);
          setAuthChecked(true);
          // Only redirect if we're not already on the login page
          if (!location.pathname.includes('/login')) {
            window.location.href = `/login?redirect=${encodeURIComponent(location.pathname)}`;
          }
          return;
        }
      }
      setIsChecking(false);
    };

    verifyAuth();
  }, [isAuthenticated, checkAuth, location.pathname, authChecked]);

  // Show loading spinner while checking authentication
  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If not authenticated and we've checked, redirect to login
  if (!isAuthenticated && authChecked) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render children
  return <>{children}</>;
}; 