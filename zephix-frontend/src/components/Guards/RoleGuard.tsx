import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface RoleGuardProps {
  roles: string[];
  children: React.ReactNode;
  fallbackPath?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ 
  roles, 
  children, 
  fallbackPath = '/dashboard' 
}) => {
  const { user, isAdmin, isMember, isViewer } = useAuthStore();

  // If no user is logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  const hasRequiredRole = roles.includes(user.organizationRole);

  // If user doesn't have required role, redirect to fallback path
  if (!hasRequiredRole) {
    console.warn(`Access denied: User role '${user.organizationRole}' not in required roles:`, roles);
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

// Convenience components for specific roles
export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RoleGuard roles={['admin']}>{children}</RoleGuard>
);

export const MemberGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RoleGuard roles={['admin', 'member']}>{children}</RoleGuard>
);

export const ViewerGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RoleGuard roles={['admin', 'member', 'viewer']}>{children}</RoleGuard>
);
