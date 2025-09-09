import { useAuthStore } from '../stores/authStore';

export const useAuth = () => {
  const store = useAuthStore();
  
  // Extract what components need
  return {
    user: store.user,
    token: store.token,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    permissions: store.user ? {
      canViewProjects: true, // Set based on user.role or actual permissions
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
    },
    login: store.login,
    logout: store.logout
  };
};