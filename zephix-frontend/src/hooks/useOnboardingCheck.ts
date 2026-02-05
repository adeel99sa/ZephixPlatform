import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onboardingApi } from '@/services/onboardingApi';
import { useAuth } from '@/state/AuthContext';

/**
 * Hook to check onboarding status and redirect if needed
 */
export function useOnboardingCheck() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      try {
        const status = await onboardingApi.getOnboardingStatus() as { completed?: boolean };

        // If onboarding is not completed, redirect to onboarding
        if (!status?.completed) {
          navigate('/onboarding', { replace: true });
        }
      } catch (error) {
        console.error('Failed to check onboarding status:', error);
        // On error, don't block navigation - let user proceed
      } finally {
        setChecking(false);
      }
    };

    checkOnboarding();
  }, [user, navigate]);

  return { checking };
}


