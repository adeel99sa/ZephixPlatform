// File: src/hooks/useAuth.ts
import { useAuthStore } from '../stores/authStore';

export const useAuth = () => {
  // Select only the specific state we need to prevent infinite re-renders
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const clearError = useAuthStore((state) => state.clearError);
  
  const permissions = user ? {
    canViewProjects: true, // Always true for authenticated users
    canManageResources: user.role === 'admin',
    canViewAnalytics: user.role === 'admin',
    canManageUsers: user.role === 'admin',
    isAdmin: user.role === 'admin'
  } : {
    canViewProjects: false,
    canManageResources: false,
    canViewAnalytics: false,
    canManageUsers: false,
    isAdmin: false
  };
  
  return {
    user,
    token: accessToken,
    isAuthenticated,
    isLoading,
    error,
    permissions,
    login,
    logout,
    clearError
  };
};