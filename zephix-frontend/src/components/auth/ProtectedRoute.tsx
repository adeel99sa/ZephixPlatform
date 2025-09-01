import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface Permissions {
  canViewProjects: boolean;
  canManageResources: boolean;
  canViewAnalytics: boolean;
  canManageUsers: boolean;
  isAdmin: boolean;
}

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: keyof Permissions;
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { user, permissions, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !permissions[requiredPermission]) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700">Access Denied</h2>
          <p className="text-gray-500">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
