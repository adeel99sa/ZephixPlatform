import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/state/AuthContext";
import { getOnboardingStatus } from "./onboarding.api";

/**
 * Single React Query source for org onboarding status.
 * Dedupes fetches across DashboardLayout (useOnboardingCheck) and home surfaces (useOrgHomeState).
 */
export const orgOnboardingStatusQueryKey = (userId: string) =>
  ["org-onboarding-status", userId] as const;

export function useOrgOnboardingStatusQuery() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? "";

  return useQuery({
    queryKey: orgOnboardingStatusQueryKey(userId),
    queryFn: getOnboardingStatus,
    enabled: Boolean(userId) && !authLoading,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}
