import { useAuthStore } from '../stores/authStore';
import { useCallback } from 'react';

/**
 * Custom hook for user state management
 * Provides a clean interface for user operations
 */
export const useUser = () => {
  const { 
    user, 
    isAuthenticated, 
    logout, 
    getCurrentUser, 
    checkAuth 
  } = useAuthStore();

  const handleLogout = useCallback(async () => {
    return await logout();
  }, [logout]);

  const handleGetCurrentUser = useCallback(async () => {
    return await getCurrentUser();
  }, [getCurrentUser]);

  const handleCheckAuth = useCallback(async () => {
    return await checkAuth();
  }, [checkAuth]);

  return {
    user,
    isAuthenticated,
    logout: handleLogout,
    getCurrentUser: handleGetCurrentUser,
    checkAuth: handleCheckAuth,
  };
};

