import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface RequireAdminProps {
  children: React.ReactNode;
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const { user, isLoading } = useAuth();
  
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
