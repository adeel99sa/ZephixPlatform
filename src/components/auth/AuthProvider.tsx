import { useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  
  useEffect(() => {
    // Initialize auth store on app startup
    console.log('🔐 Initializing auth store...');
    initializeAuth();
  }, [initializeAuth]);
  
  return <>{children}</>;
}