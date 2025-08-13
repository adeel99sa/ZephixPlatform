import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../../hooks/useUser';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, checkAuth } = useUser();
  const location = useLocation();

  useEffect(() => {
    // Check authentication status when component mounts
    checkAuth();
  }, [checkAuth]);

  // If not authenticated, redirect to login with return URL
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated, render the protected content
  return <>{children}</>;
};
