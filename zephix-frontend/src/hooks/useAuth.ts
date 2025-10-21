// File: src/hooks/useAuth.ts
import { useAuthStore } from '../stores/authStore';

export const useAuth = () => {
  const store = useAuthStore();
  
  const permissions = store.user ? {
    canViewProjects: true, // Always true for authenticated users
    canManageResources: store.user.role === 'admin',
    canViewAnalytics: store.user.role === 'admin',
    canManageUsers: store.user.role === 'admin',
    isAdmin: store.user.role === 'admin'
  } : {
    canViewProjects: false,
    canManageResources: false,
    canViewAnalytics: false,
    canManageUsers: false,
    isAdmin: false
  };
  
  return {
    user: store.user,
    token: store.accessToken,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    permissions,
    login: store.login,
    signup: store.signup,
    logout: store.logout,
    clearError: store.clearError
  };
};