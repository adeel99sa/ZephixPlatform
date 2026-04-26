import {
  deriveOnboardingStatusValue,
  type OnboardingStatus,
  type OnboardingStatusValue,
} from "./onboarding.api";
import { useOrgOnboardingStatusQuery } from "./useOrgOnboardingStatusQuery";

import { useAuth } from "@/state/AuthContext";
import { platformRoleFromUser } from "@/utils/roles";

export type OrgHomeState = {
  isLoading: boolean;
  status: OnboardingStatus | undefined;
  onboardingStatus: OnboardingStatusValue;
  workspaceCount: number;
  mustOnboard: boolean;
  skipped: boolean;
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
  const onboardingStatus = deriveOnboardingStatusValue(status);

  const platformRole = platformRoleFromUser(user);
  const isAdmin = platformRole === "ADMIN";
  const isMember = platformRole === "MEMBER";
  const isViewer = platformRole === "VIEWER";

  return {
    /** True until first fetch settles (success or error). Legacy pages may show a skeleton. */
    isLoading: q.isPending && !q.isError,
    status,
    onboardingStatus,
    workspaceCount,
    mustOnboard,
    skipped,
    isAdmin,
    isMember,
    isViewer,
  };
}
