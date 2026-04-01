import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspaceStore } from "@/state/workspace.store";
import { track } from "@/lib/telemetry";
import {
  Briefcase,
  UserPlus,
  Layers,
  BookOpen,
  X,
  CheckCircle2,
} from "lucide-react";

const DISMISSED_KEY = "zephix.firstValuePromptDismissed";

/**
 * First-value activation prompt shown on workspace home after first workspace creation.
 * Helps admin discover next steps: review sample project, invite team, create project.
 * Dismissible and persists dismissal in localStorage.
 */
export function FirstValuePrompt() {
  const nav = useNavigate();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISSED_KEY) === "true") {
        setDismissed(true);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  if (dismissed || !activeWorkspaceId) return null;

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {}
    track("first_value_prompt_dismissed");
  }

  return (
    <div className="rounded-xl border border-green-200 bg-green-50/50 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <h3 className="text-sm font-semibold text-gray-900">Workspace created</h3>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        A sample project has been created to help you explore. Here's what to do next:
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <NextStep
          icon={<BookOpen className="h-4 w-4" />}
          label="Review sample project"
          onClick={() => {
            track("first_value_review_sample");
            nav(`/workspaces/${activeWorkspaceId}`);
          }}
        />
        <NextStep
          icon={<UserPlus className="h-4 w-4" />}
          label="Invite team"
          onClick={() => {
            track("first_value_invite_team");
            nav("/administration/users");
          }}
        />
        <NextStep
          icon={<Layers className="h-4 w-4" />}
          label="Create project from template"
          onClick={() => {
            track("first_value_create_project");
            nav("/templates");
          }}
        />
        <NextStep
          icon={<Briefcase className="h-4 w-4" />}
          label="Open workspace dashboard"
          onClick={() => {
            track("first_value_open_dashboard");
            nav(`/workspaces/${activeWorkspaceId}`);
          }}
        />
      </div>
    </div>
  );
}

function NextStep(p: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={p.onClick}
      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <span className="text-gray-400">{p.icon}</span>
      {p.label}
    </button>
  );
}
