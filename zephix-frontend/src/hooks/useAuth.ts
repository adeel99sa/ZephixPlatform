// File: src/hooks/useAuth.ts
import { useAuthStore } from '../stores/authStore';

import { isPlatformAdmin } from '@/utils/access';

export const useAuth = () => {
  const store = useAuthStore();
  
  const permissions = store.user ? {
    canViewProjects: true, // Always true for authenticated users
    canManageResources: isPlatformAdmin(store.user),
    canViewAnalytics: isPlatformAdmin(store.user),
    canManageUsers: isPlatformAdmin(store.user),
    isAdmin: isPlatformAdmin(store.user),
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