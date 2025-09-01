// src/hooks/useAuth.ts (replace entire file)
import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    login: storeLogin, 
    logout: storeLogout 
  } = useAuthStore();
  
  // Map Zustand store to expected format for existing components
  const permissions = {
    canViewProjects: isAuthenticated,
    canManageResources: user?.role === 'ADMIN' || user?.role === 'MANAGER',
    canViewAnalytics: isAuthenticated,
    canManageUsers: user?.role === 'ADMIN',
    isAdmin: user?.role === 'ADMIN',
  };

  // Map user to expected format with name field
  const mappedUser = user ? {
    ...user,
    name: `${user.firstName} ${user.lastName}`.trim()
  } : null;

  // Wrap login to match expected signature
  const login = async (email: string, password: string) => {
    const success = await storeLogin(email, password);
    if (!success) {
      throw new Error('Login failed');
    }
  };

  return {
    user: mappedUser,
    permissions,
    login,
    logout: storeLogout,
    isLoading,
    isAuthenticated
  };
}

// Export the auth store directly for components that want to use it
export { useAuthStore } from '@/stores/authStore';