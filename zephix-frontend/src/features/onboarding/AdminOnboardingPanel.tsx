import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspaceStore } from "@/state/workspace.store";
import { useQueryClient } from "@tanstack/react-query";
import { skipOnboarding, completeOnboarding } from "@/features/organizations/onboarding.api";
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

  // Don't render if onboarding is done
  if (onboardingStatus === "completed" || onboardingStatus === "dismissed") {
    return null;
  }

  const hasWorkspace = workspaceCount > 0;

  async function handleDismiss() {
    setDismissing(true);
    try {
      await skipOnboarding();
      track("onboarding_dismissed", { role: "admin", step });
      qc.invalidateQueries({ queryKey: ["org-onboarding-status"] });
    } finally {
      setDismissing(false);
    }
  }

  async function handleComplete() {
    try {
      await completeOnboarding();
      track("onboarding_completed", { role: "admin", useCase: selectedUseCase });
      qc.invalidateQueries({ queryKey: ["org-onboarding-status"] });
      setStep("complete");
    } catch {
      // Non-blocking — still show completion
      setStep("complete");
    }
  }

  function handleUseCaseSelect(id: string) {
    setSelectedUseCase(id);
    track("use_case_selected", { useCase: id });
    // Store for future template personalization (Batch 3+)
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
          {hasWorkspace && (
            <button
              onClick={() => nav("/workspaces")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Open workspace <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => navIfWorkspace("/templates")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Rocket className="h-3.5 w-3.5" /> Create first project
          </button>
          <button
            onClick={() => nav("/administration/users")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <UserPlus className="h-3.5 w-3.5" /> Invite team
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
            onClick={handleDismiss}
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
          <button
            onClick={() => setStep("welcome")}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Back
          </button>
          <button
            onClick={handleComplete}
            disabled={!selectedUseCase}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  /* ── Welcome step (default) ── */
  return (
    <div className="mx-auto max-w-lg rounded-xl border-2 border-indigo-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-gray-900">Welcome to Zephix</h2>
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          className="text-gray-400 hover:text-gray-600"
          title="Skip setup"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        {hasWorkspace
          ? "Get the most out of your workspace."
          : "Let's set up your organization in a few quick steps."}
      </p>
      <div className="space-y-2 mb-5">
        {!hasWorkspace ? (
          <>
            <ActionItem
              icon={<Briefcase className="h-4 w-4" />}
              label="Create your first workspace"
              onClick={() => nav("/setup/workspace")}
            />
            <ActionItem
              icon={<UserPlus className="h-4 w-4" />}
              label="Invite team members"
              onClick={() => nav("/administration/users")}
            />
            <ActionItem
              icon={<Compass className="h-4 w-4" />}
              label="Choose your use case"
              onClick={() => setStep("use_case")}
            />
          </>
        ) : (
          <>
            <ActionItem
              icon={<Rocket className="h-4 w-4" />}
              label="Create first project from template"
              onClick={() => navIfWorkspace("/templates")}
            />
            <ActionItem
              icon={<UserPlus className="h-4 w-4" />}
              label="Invite team members"
              onClick={() => nav("/administration/users")}
            />
            <ActionItem
              icon={<Briefcase className="h-4 w-4" />}
              label="Open workspace dashboard"
              onClick={() => nav("/workspaces")}
            />
          </>
        )}
      </div>
      <div className="flex items-center justify-between">
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
        >
          <SkipForward className="h-3 w-3" />
          {dismissing ? "Skipping..." : "Skip for now"}
        </button>
        <button
          onClick={() => setStep("use_case")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Next <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function ActionItem(p: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={p.onClick}
      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
    >
      <span className="text-gray-400">{p.icon}</span>
      <span className="font-medium">{p.label}</span>
      <ArrowRight className="ml-auto h-3.5 w-3.5 text-gray-300" />
    </button>
  );
}
