import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/state/AuthContext";
import { platformRoleFromUser } from "@/utils/roles";
import { useOrgOnboardingStatusQuery, orgOnboardingStatusQueryKey } from "@/features/organizations/useOrgOnboardingStatusQuery";
import { skipOnboarding } from "@/features/organizations/onboarding.api";
import { shouldUseFullPageOnboarding } from "@/features/onboarding/onboarding-route-policy";

const FAIL_OPEN_MS = 12_000;

/**
 * Full-page bootstrap onboarding (no shell). Only for strict Admin first-run; everyone else is sent to /home.
 * Primary path: invite team. Secondary: skip (persists dismissed). Tertiary: create workspace later.
 */
export default function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? "";
  const { data: status, isPending, isError, isFetched } = useOrgOnboardingStatusQuery();
  const [submitting, setSubmitting] = useState(false);
  const [failOpen, setFailOpen] = useState(false);

  useEffect(() => {
    if (authLoading || !userId) return;
    const t = window.setTimeout(() => setFailOpen(true), FAIL_OPEN_MS);
    return () => window.clearTimeout(t);
  }, [authLoading, userId]);

  useEffect(() => {
    if (authLoading || !user) return;

    if (isError || failOpen) {
      navigate("/home", { replace: true });
      return;
    }

    if (!isFetched || isPending) return;

    const platformRole = platformRoleFromUser(user);
    if (platformRole !== "ADMIN") {
      navigate("/home", { replace: true });
      return;
    }

    const hasAccessibleWorkspace = Number(status?.workspaceCount ?? 0) > 0;
    const eligible = shouldUseFullPageOnboarding({
      platformRole,
      onboardingStatus: status?.onboardingStatus,
      completed: Boolean(status?.completed),
      dismissed: Boolean(status?.dismissed),
      hasAccessibleWorkspace,
    });

    if (!eligible) {
      navigate("/home", { replace: true });
    }
  }, [
    authLoading,
    user,
    isError,
    isFetched,
    isPending,
    status,
    navigate,
    failOpen,
  ]);

  async function handleSkip() {
    if (!userId) return;
    setSubmitting(true);
    try {
      await skipOnboarding();
      await queryClient.invalidateQueries({ queryKey: orgOnboardingStatusQueryKey(userId) });
      toast.success("Setup skipped");
      navigate("/home", { replace: true });
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || "Failed to skip setup");
    } finally {
      setSubmitting(false);
    }
  }

  function handleInvite() {
    navigate("/administration/users", { replace: false });
  }

  function handleCreateWorkspaceLater() {
    navigate("/setup/workspace", { replace: false });
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (isError || failOpen) {
    return null;
  }

  if (!isFetched || isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  const platformRole = platformRoleFromUser(user);
  if (platformRole !== "ADMIN") {
    return null;
  }

  const hasAccessibleWorkspace = Number(status?.workspaceCount ?? 0) > 0;
  const eligible = shouldUseFullPageOnboarding({
    platformRole,
    onboardingStatus: status?.onboardingStatus,
    completed: Boolean(status?.completed),
    dismissed: Boolean(status?.dismissed),
    hasAccessibleWorkspace,
  });

  if (!eligible) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border-2 border-indigo-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Invite your team</h1>
        <p className="mt-2 text-sm text-gray-600">
          Bring your team into Zephix so they can access work, dashboards, and updates.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleInvite}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Invite members
          </button>
          <button
            type="button"
            onClick={() => void handleSkip()}
            disabled={submitting}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Skip setup"}
          </button>
          <button
            type="button"
            onClick={handleCreateWorkspaceLater}
            className="text-center text-sm text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
          >
            Create workspace later
          </button>
        </div>
      </div>
    </div>
  );
}
