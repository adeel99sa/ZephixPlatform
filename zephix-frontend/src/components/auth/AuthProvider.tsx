import { useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  
  useEffect(() => {
    // Check authentication status on app startup
    console.log('🔐 Checking authentication status...');
    // Temporarily disabled to prevent API calls during infinite loop
    // checkAuth();
  }, []); // Remove checkAuth from dependencies to prevent infinite loop
  
  return <>{children}</>;
}
