// File: src/hooks/useAuth.ts
import { useAuthStore } from '../stores/authStore';

export const useAuth = () => {
  const store = useAuthStore();
  
  // DEBUG LOGGING
  console.log('[useAuth] Store state:', {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    token: store.token ? 'exists' : 'null'
  });
  
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
  
  console.log('[useAuth] Computed permissions:', permissions);
  
  return {
    user: store.user,
    token: store.token,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    permissions,
    login: store.login,
    logout: store.logout
  };
};