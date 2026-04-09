import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function usePostLoginRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    // Phase 4.7: Inbox is the canonical post-login landing surface.
    // The retired /home route is bypassed to avoid the redirect chain
    // identified in the platform audit.
    navigate('/inbox', { replace: true });
  }, [navigate]);
}
