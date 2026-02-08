import { useQuery } from "@tanstack/react-query";
import { getOnboardingStatus, type OnboardingStatus } from "./onboarding.api";
import { useAuth } from "@/state/AuthContext";

type PlatformRole = "ADMIN" | "MEMBER" | "VIEWER" | "GUEST";

export type OrgHomeState = {
  isLoading: boolean;
  status: OnboardingStatus | undefined;
  workspaceCount: number;
  mustOnboard: boolean;
  skipped: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isViewer: boolean;
};

export function useOrgHomeState(): OrgHomeState {
  const { user } = useAuth();

  const q = useQuery({
    queryKey: ["org-onboarding-status"],
    queryFn: getOnboardingStatus,
    staleTime: 30_000,
    enabled: Boolean(user),
  });

  const status = q.data;
  const workspaceCount = Number(status?.workspaceCount ?? 0);
  const mustOnboard = Boolean(status?.mustOnboard ?? false);
  const skipped = Boolean(status?.skipped ?? false);

  const platformRole = (user?.platformRole ?? user?.role) as PlatformRole | undefined;
  const isAdmin = platformRole === "ADMIN";
  const isMember = platformRole === "MEMBER";
  const isViewer = platformRole === "VIEWER" || platformRole === "GUEST";

  return {
    isLoading: q.isLoading,
    status,
    workspaceCount,
    mustOnboard,
    skipped,
    isAdmin,
    isMember,
    isViewer,
  };
}
