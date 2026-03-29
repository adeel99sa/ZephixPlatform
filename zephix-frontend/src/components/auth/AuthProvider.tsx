import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const hasBootstrappedAuth = useRef(false);

  useEffect(() => {
    if (hasBootstrappedAuth.current) {
      return;
    }
    hasBootstrappedAuth.current = true;
    void checkAuth();
  }, [checkAuth]);

  return <>{children}</>;
}
