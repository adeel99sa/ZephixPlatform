import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspaceStore } from "@/state/workspace.store";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/state/AuthContext";
import { skipOnboarding, completeOnboarding } from "@/features/organizations/onboarding.api";
import { orgOnboardingStatusQueryKey } from "@/features/organizations/useOrgOnboardingStatusQuery";
import { useOrgHomeState } from "@/features/organizations/useOrgHomeState";
import { track } from "@/lib/telemetry";
import {
  Briefcase,
  UserPlus,
  Compass,
  SkipForward,
  ArrowRight,
  CheckCircle2,
  Rocket,
  X,
} from "lucide-react";

/* ── Use-case options ── */
const USE_CASES = [
  { id: "sprint_planning", label: "Sprint planning", icon: "🏃" },
  { id: "client_delivery", label: "Client delivery", icon: "🤝" },
  { id: "internal_projects", label: "Internal projects", icon: "🏢" },
  { id: "portfolio_governance", label: "Portfolio governance", icon: "📊" },
  { id: "product_launch", label: "Product launch", icon: "🚀" },
] as const;

type Step = "welcome" | "use_case" | "complete";

export function AdminOnboardingPanel() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { workspaceCount, onboardingStatus } = useOrgHomeState();

  function navIfWorkspace(path: string) {
    if (!activeWorkspaceId) {
      nav("/workspaces");
      return;
    }
    nav(path);
  }
  const [step, setStep] = useState<Step>("welcome");
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState(false);

  if (onboardingStatus === "completed" || onboardingStatus === "dismissed") {
    return null;
  }

  const hasWorkspace = workspaceCount > 0;

  async function invalidateOnboarding() {
    if (userId) {
      await qc.invalidateQueries({ queryKey: orgOnboardingStatusQueryKey(userId) });
    } else {
      await qc.invalidateQueries({ queryKey: ["org-onboarding-status"] });
    }
  }

  async function handleDismiss() {
    setDismissing(true);
    try {
      await skipOnboarding();
      track("onboarding_dismissed", { role: "admin", step });
      await invalidateOnboarding();
    } finally {
      setDismissing(false);
    }
  }

  async function handleComplete() {
    try {
      await completeOnboarding();
      track("onboarding_completed", { role: "admin", useCase: selectedUseCase });
      await invalidateOnboarding();
      setStep("complete");
    } catch {
      setStep("complete");
    }
  }

  function handleUseCaseSelect(id: string) {
    setSelectedUseCase(id);
    track("use_case_selected", { useCase: id });
    try {
      localStorage.setItem("zephix.useCase", id);
    } catch {
      // localStorage not available
    }
  }

  /* ── Completion moment ── */
  if (step === "complete") {
    return (
      <div className="mx-auto max-w-lg rounded-xl border-2 border-green-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">You're all set</h2>
        <p className="text-sm text-gray-500 mb-6">
          {hasWorkspace ? "Your workspace is ready." : "Zephix is ready for you."}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => nav("/administration/users")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <UserPlus className="h-3.5 w-3.5" /> Invite members
          </button>
          {hasWorkspace && (
            <button
              type="button"
              onClick={() => nav("/workspaces")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Open workspace <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => navIfWorkspace("/templates")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Rocket className="h-3.5 w-3.5" /> Create first project
          </button>
        </div>
      </div>
    );
  }

  /* ── Use-case selection step ── */
  if (step === "use_case") {
    return (
      <div className="mx-auto max-w-lg rounded-xl border-2 border-indigo-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">What are you using Zephix for?</h2>
          <button
            type="button"
            onClick={() => void handleDismiss()}
            disabled={dismissing}
            className="text-gray-400 hover:text-gray-600"
            title="Skip"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2 mb-4">
          {USE_CASES.map((uc) => (
            <button
              key={uc.id}
              type="button"
              onClick={() => handleUseCaseSelect(uc.id)}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                selectedUseCase === uc.id
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span className="text-lg">{uc.icon}</span>
              <span className="font-medium">{uc.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setStep("welcome")} className="text-sm text-gray-500 hover:text-gray-700">
            Back
          </button>
          <button
            type="button"
            onClick={() => void handleComplete()}
            disabled={!selectedUseCase}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  /* ── Welcome: invite-first (no workspace) ── */
  if (!hasWorkspace) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border-2 border-indigo-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-gray-900">Invite your team</h2>
          <button
            type="button"
            onClick={() => void handleDismiss()}
            disabled={dismissing}
            className="text-gray-400 hover:text-gray-600"
            title="Skip setup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Bring your team into Zephix so they can access work, dashboards, and updates.
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => nav("/administration/users")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <UserPlus className="h-4 w-4" />
            Invite members
          </button>
          <button
            type="button"
            onClick={() => void handleDismiss()}
            disabled={dismissing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {dismissing ? "Saving…" : "Skip setup"}
          </button>
          <button
            type="button"
            onClick={() => nav("/setup/workspace")}
            className="text-center text-sm text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
          >
            Create workspace later
          </button>
          <button
            type="button"
            onClick={() => setStep("use_case")}
            className="text-center text-sm text-gray-400 hover:text-gray-600"
          >
            <span className="inline-flex items-center gap-1">
              <Compass className="h-3.5 w-3.5" /> Personalize with your use case
            </span>
          </button>
        </div>
      </div>
    );
  }

  /* ── Welcome: has workspace — still invite-first ── */
  return (
    <div className="mx-auto max-w-lg rounded-xl border-2 border-indigo-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-gray-900">Invite your team</h2>
        <button
          type="button"
          onClick={() => void handleDismiss()}
          disabled={dismissing}
          className="text-gray-400 hover:text-gray-600"
          title="Skip setup"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Bring collaborators in from Administration, or continue setting up your workspace.
      </p>
      <div className="space-y-2 mb-5">
        <ActionItem
          icon={<UserPlus className="h-4 w-4" />}
          label="Invite members"
          onClick={() => nav("/administration/users")}
        />
        <ActionItem
          icon={<Rocket className="h-4 w-4" />}
          label="Create first project from template"
          onClick={() => navIfWorkspace("/templates")}
        />
        <ActionItem
          icon={<Briefcase className="h-4 w-4" />}
          label="Open workspace dashboard"
          onClick={() => nav("/workspaces")}
        />
        <button
          type="button"
          onClick={() => setStep("use_case")}
          className="flex w-full items-center justify-center gap-1 py-2 text-xs text-gray-400 hover:text-gray-600"
        >
          <Compass className="h-3.5 w-3.5" /> Personalize with your use case
        </button>
      </div>
      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={() => void handleDismiss()}
          disabled={dismissing}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
        >
          <SkipForward className="h-3 w-3" />
          {dismissing ? "Skipping…" : "Skip setup"}
        </button>
      </div>
    </div>
  );
}

function ActionItem(p: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={p.onClick}
      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
    >
      <span className="text-gray-400">{p.icon}</span>
      <span className="font-medium">{p.label}</span>
      <ArrowRight className="ml-auto h-3.5 w-3.5 text-gray-300" />
    </button>
  );
}
