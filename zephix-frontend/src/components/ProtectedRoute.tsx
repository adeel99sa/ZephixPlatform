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
  const location = useLocation();

  useEffect(() => {
    const verifyAuth = async () => {
      if (!isAuthenticated) {
        const isValid = await checkAuth();
        if (!isValid) {
          // Redirect to login with return URL
          window.location.href = `/login?redirect=${encodeURIComponent(location.pathname)}`;
          return;
        }
      }
      setIsChecking(false);
    };

    verifyAuth();
  }, [isAuthenticated, checkAuth, location.pathname]);

  // Show loading spinner while checking authentication
  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render children
  return <>{children}</>;
}; 