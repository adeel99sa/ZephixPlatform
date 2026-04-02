import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { onboardingApi } from '@/services/onboardingApi';
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
 * Only ADMIN users are redirected to /onboarding.
 * MEMBER and VIEWER/GUEST are never redirected — they land on org-home
 * which shows the appropriate waiting/shared state.
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

    // Non-admin users skip the onboarding redirect entirely.
    // They see org-home which handles zero-workspace state per role.
    const platformRole = user.platformRole ?? (user as any).role;
    const isAdmin = platformRole === "ADMIN";
    if (!isAdmin) {
      setState({
        checking: false,
        onboardingComplete: true,
        error: null,
      });
      return;
    }

    // If already on onboarding page, don't redirect in a loop
    if (location.pathname === '/onboarding') {
      setState({
        checking: false,
        onboardingComplete: false, // Still not complete, but don't redirect
        error: null,
      });
      return;
    }

    try {
      const status = await onboardingApi.getOnboardingStatus() as {
        completed?: boolean;
        mustOnboard?: boolean;
        skipped?: boolean;
        workspaceCount?: number;
      };

      // Use mustOnboard as the source of truth for redirect (admin only)
      // mustOnboard = true means: no workspaces AND not skipped
      if (status?.mustOnboard === true) {
        console.log('[OnboardingCheck] Admin mustOnboard=true, redirecting to /onboarding');
        navigate('/onboarding', { replace: true });
        setState({
          checking: false,
          onboardingComplete: false,
          error: null,
        });
      } else {
        // Either completed (has workspaces) or skipped - safe to proceed
        console.log('[OnboardingCheck] Safe to proceed:', {
          completed: status?.completed,
          skipped: status?.skipped,
          workspaceCount: status?.workspaceCount,
        });
        setState({
          checking: false,
          onboardingComplete: true,
          error: null,
        });
      }
    } catch (error: any) {
      console.error('[OnboardingCheck] Failed to check onboarding status:', error);
      // On error, allow user to proceed (don't block the app)
      setState({
        checking: false,
        onboardingComplete: true, // Assume complete on error to not block
        error: error?.message || 'Failed to check onboarding status',
      });
    }
  }, [authLoading, user, navigate, location.pathname]);

  useEffect(() => {
    checkOnboarding();
  }, [checkOnboarding]);

  return state;
}


