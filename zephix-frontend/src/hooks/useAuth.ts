// File: src/hooks/useAuth.ts
import { useAuthStore } from '../stores/authStore';
import { platformRoleFromUser } from '@/utils/roles';

export const useAuth = () => {
  const store = useAuthStore();
  
  const permissions = store.user ? {
    canViewProjects: true, // Always true for authenticated users
    canManageResources: platformRoleFromUser(store.user) === 'ADMIN',
    canViewAnalytics: platformRoleFromUser(store.user) === 'ADMIN',
    canManageUsers: platformRoleFromUser(store.user) === 'ADMIN',
    isAdmin: platformRoleFromUser(store.user) === 'ADMIN'
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