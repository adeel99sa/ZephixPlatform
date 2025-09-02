import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  
  useEffect(() => {
    checkAuth();
  }, []);

  const permissions = {
    canViewProjects: true,
    canManageResources: true,
    canViewAnalytics: true,
    canManageUsers: user?.role === 'admin',
    isAdmin: user?.role === 'admin',
  };

  return {
    user,
    permissions,
    isAuthenticated,
    isLoading,
  };
}
