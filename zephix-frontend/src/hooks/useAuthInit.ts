import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

export function useAuthInit() {
  const checkAuth = useAuthStore(state => state.checkAuth);
  
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
}
