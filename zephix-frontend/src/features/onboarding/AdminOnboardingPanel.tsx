import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { skipOnboarding, completeOnboarding } from "@/features/organizations/onboarding.api";
import { useOrgHomeState } from "@/features/organizations/useOrgHomeState";
import { useAuth } from "@/state/AuthContext";
import { track } from "@/lib/telemetry";
import {
  UserPlus,
  Briefcase,
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
  const { workspaceCount, onboardingStatus } = useOrgHomeState();
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
      nav("/home", { replace: true });
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
            onClick={() => nav("/administration/users")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <UserPlus className="h-3.5 w-3.5" /> Invite team
          </button>
          {hasWorkspace && (
            <button
              onClick={() => nav("/workspaces")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Open workspace <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => nav("/templates")}
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

  /* ── Welcome step: invite-first CTA order ── */
  return (
    <div className="mx-auto max-w-lg rounded-xl border-2 border-indigo-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-gray-900">Invite your team</h2>
        <button
          onClick={handleDismiss}
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

      {/* Primary: Invite members */}
      <button
        onClick={() => nav("/administration/users")}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 mb-3"
      >
        <UserPlus className="h-4 w-4" />
        Invite members
      </button>

      {/* Secondary: Skip setup */}
      <button
        onClick={handleDismiss}
        disabled={dismissing}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 mb-4"
      >
        <SkipForward className="h-4 w-4 text-gray-400" />
        {dismissing ? "Skipping..." : "Skip setup"}
      </button>

      {/* Tertiary: Create workspace later + Use case */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
        <button
          onClick={() => nav("/setup/workspace")}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          <Briefcase className="mr-1 inline h-3 w-3" />
          Create workspace later
        </button>
        <button
          onClick={() => setStep("use_case")}
          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
        >
          <Compass className="h-3 w-3" />
          Choose use case
        </button>
      </div>
    </div>
  );
}
