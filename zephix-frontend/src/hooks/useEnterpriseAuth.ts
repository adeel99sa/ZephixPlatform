import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';

export const useEnterpriseAuth = () => {
  const store = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  
  const clearError = () => setError(null);
  
  // Handle login properly with error handling
  const login = async (email: string, password: string) => {
    try {
      setError(null);
      return await store.login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      return false;
    }
  };
  
  return {
    ...store,
    error,
    clearError,
    login
  };
};