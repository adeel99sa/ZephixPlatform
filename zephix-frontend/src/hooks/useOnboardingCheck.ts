import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/state/AuthContext';

export interface OnboardingCheckState {
  /** True while checking onboarding status */
  checking: boolean;
  /** True if onboarding is complete (safe to render workspace UI) */
  onboardingComplete: boolean;
  /** Error message if check failed */
  error: string | null;
}

/**
 * Hook to check onboarding status and redirect if needed.
 * 
 * MUST be called before any workspace validation or API calls.
 * Returns onboardingComplete=true only when safe to proceed.
 * 
 * Uses server-provided user flag onboardingCompleted as source of truth.
 */
export function useOnboardingCheck(): OnboardingCheckState {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [state, setState] = useState<OnboardingCheckState>({
    checking: true,
    onboardingComplete: false,
    error: null,
  });

  const checkOnboarding = useCallback(async () => {
    // Wait for auth to be ready
    if (authLoading) return;
    
    // If no user, not authenticated - don't block
    if (!user) {
      setState({
        checking: false,
        onboardingComplete: false,
        error: null,
      });
      return;
    }

    // Treat missing/undefined as completed so the guard is compatible with
    // backend versions that do not yet return onboardingCompleted in /auth/me.
    // Only an explicit `false` should trigger the onboarding redirect.
    const isCompleted = user.onboardingCompleted !== false;
    if (!isCompleted) {
      if (location.pathname !== '/onboarding') {
        navigate('/onboarding', { replace: true });
      }
      setState({
        checking: false,
        onboardingComplete: false,
        error: null,
      });
      return;
    }

    setState({
      checking: false,
      onboardingComplete: true,
      error: null,
    });
  }, [authLoading, user, navigate, location.pathname]);

  useEffect(() => {
    checkOnboarding();
  }, [checkOnboarding]);

  return state;
}


