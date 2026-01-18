import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function usePostLoginRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    // Always redirect to /home after login
    // HomeRouterPage will handle workspace resolution and role-based routing
    navigate('/home', { replace: true });
  }, [navigate]);
}
