import { apiClient } from '@/lib/api/client';

/**
 * Onboarding API Service
 * Handles onboarding status and completion
 */
class OnboardingApiService {
  /**
   * Get onboarding status for current organization
   */
  async getOnboardingStatus() {
    const { data } = await apiClient.get('/organizations/onboarding/status');
    return data;
  }

  /**
   * Mark onboarding step as complete
   */
  async completeStep(step: string) {
    const { data } = await apiClient.post('/organizations/onboarding/complete-step', { step });
    return data;
  }

  /**
   * Mark entire onboarding as complete
   */
  async completeOnboarding() {
    const { data } = await apiClient.post('/organizations/onboarding/complete');
    return data;
  }

  /**
   * Skip onboarding (for users who want to skip)
   */
  async skipOnboarding() {
    const { data } = await apiClient.post('/organizations/onboarding/skip');
    return data;
  }

  /**
   * Get onboarding progress
   */
  async getProgress() {
    const { data } = await apiClient.get('/organizations/onboarding/progress');
    return data;
  }
}

export const onboardingApi = new OnboardingApiService();

