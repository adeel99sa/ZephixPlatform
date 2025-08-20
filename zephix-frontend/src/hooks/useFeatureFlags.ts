import { FeatureFlagService, FeatureFlags } from '../utils/featureFlags';

export const useFeatureFlags = () => {
  return {
    isEnabled: (flag: keyof FeatureFlags) => FeatureFlagService.isEnabled(flag),
    flags: FeatureFlagService.getFlags()
  };
};

