import { type OnboardingStatus } from "./onboarding.api";
import { useAuth } from "@/state/AuthContext";
import { platformRoleFromUser } from "@/utils/roles";
import { useOrgOnboardingStatusQuery } from "./useOrgOnboardingStatusQuery";

export type OrgHomeState = {
  isLoading: boolean;
  status: OnboardingStatus | undefined;
  workspaceCount: number;
  mustOnboard: boolean;
  skipped: boolean;
  dismissed: boolean;
  onboardingStatus: OnboardingStatus["onboardingStatus"] | undefined;
  isAdmin: boolean;
  isMember: boolean;
  isViewer: boolean;
};

export function useOrgHomeState(): OrgHomeState {
  const { user } = useAuth();

  const q = useOrgOnboardingStatusQuery();

  const status = q.data;
  const workspaceCount = Number(status?.workspaceCount ?? 0);
  const mustOnboard = Boolean(status?.mustOnboard ?? false);
  const skipped = Boolean(status?.skipped ?? false);
  const dismissed = Boolean(status?.dismissed ?? status?.skipped ?? false);

  const platformRole = platformRoleFromUser(user);
  const isAdmin = platformRole === "ADMIN";
  const isMember = platformRole === "MEMBER";
  const isViewer = platformRole === "VIEWER";

  return {
    /** True until first fetch settles (success or error). Legacy pages may show a skeleton. */
    isLoading: q.isPending && !q.isError,
    status,
    workspaceCount,
    mustOnboard,
    skipped,
    dismissed,
    onboardingStatus: status?.onboardingStatus,
    isAdmin,
    isMember,
    isViewer,
  };
}
