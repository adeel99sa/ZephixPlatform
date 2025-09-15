// File: src/components/auth/ProtectedRoute.tsx
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const token = useAuthStore(state => state.accessToken);
  const user = useAuthStore(state => state.user);
  const location = useLocation();
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for Zustand to hydrate from localStorage
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Debug logging
  useEffect(() => {
    if (isHydrated) {
      console.log('ProtectedRoute check after hydration:', {
        path: location.pathname,
        hasToken: !!token,
        hasUser: !!user,
        tokenPreview: token ? token.substring(0, 20) + '...' : null
      });
    }
  }, [isHydrated, location.pathname, token, user]);

  // Don't check auth until store is hydrated
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Check authentication after hydration
  const hasValidSession = !!(token && user);

  if (!hasValidSession) {
    console.log('No valid session, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}