import { Navigate } from 'react-router-dom';
import { useEnterpriseAuth } from '../../hooks/useEnterpriseAuth';

interface RequireAdminProps {
  children: React.ReactNode;
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const { user, isLoading } = useEnterpriseAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  // Quick fix: Check email instead of role
  if (user?.email === 'admin@zephix.ai') {
    // Admin access granted
    return <>{children}</>;
  }
  
  // Not admin, redirect to dashboard
  return <Navigate to="/dashboard" replace />;
}
