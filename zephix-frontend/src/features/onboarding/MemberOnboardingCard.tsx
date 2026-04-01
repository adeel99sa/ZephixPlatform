import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { skipOnboarding } from "@/features/organizations/onboarding.api";
import { useOrgHomeState } from "@/features/organizations/useOrgHomeState";
import { track } from "@/lib/telemetry";
import { ListChecks, Inbox, UserCircle, X } from "lucide-react";
import { useState } from "react";

export function MemberOnboardingCard() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { onboardingStatus } = useOrgHomeState();
  const [dismissing, setDismissing] = useState(false);

  if (onboardingStatus === "completed" || onboardingStatus === "dismissed") {
    return null;
  }

  async function handleDismiss() {
    setDismissing(true);
    try {
      await skipOnboarding();
      track("onboarding_dismissed", { role: "member" });
      qc.invalidateQueries({ queryKey: ["org-onboarding-status"] });
    } finally {
      setDismissing(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Welcome to Zephix</h3>
          <p className="text-xs text-gray-500 mt-0.5">Here are some quick ways to get started.</p>
        </div>
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          className="text-gray-400 hover:text-gray-600"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <QuickAction icon={<ListChecks className="h-3.5 w-3.5" />} label="My Tasks" onClick={() => nav("/projects")} />
        <QuickAction icon={<Inbox className="h-3.5 w-3.5" />} label="Inbox" onClick={() => nav("/inbox")} />
        <QuickAction icon={<UserCircle className="h-3.5 w-3.5" />} label="Set up profile" onClick={() => nav("/settings/profile")} />
      </div>
    </div>
  );
}

function QuickAction(p: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={p.onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
    >
      {p.icon}
      {p.label}
    </button>
  );
}
