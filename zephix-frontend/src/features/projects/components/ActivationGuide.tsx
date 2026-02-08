/**
 * ActivationGuide — non-blocking overlay with 3 hints for first-time project activation.
 *
 * Rules:
 *  - Only shows once per user (localStorage flag)
 *  - Only shows for activation projects (localStorage marker from ActivationTemplatePicker)
 *  - Dismissible — never reappears
 *  - Never blocks interaction
 */

import { useState, useEffect } from "react";
import { X, Layers, ListChecks, CheckCircle2 } from "lucide-react";
import { track } from "@/lib/telemetry";
import { useAuth } from "@/state/AuthContext";
import { useWorkspaceStore } from "@/state/workspace.store";

const DISMISSED_KEY = "zephix_activation_hint_dismissed";
const ACTIVATION_PROJECT_KEY = "zephix_activation_project";

const HINTS = [
  {
    icon: <Layers className="h-4 w-4" />,
    text: "Add your first phase",
  },
  {
    icon: <ListChecks className="h-4 w-4" />,
    text: "Add your first task",
  },
  {
    icon: <CheckCircle2 className="h-4 w-4" />,
    text: "Mark it done",
  },
];

export function ActivationGuide({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const organizationId = user?.organizationId;
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY);
      if (dismissed === "true") return;

      const activationProject = localStorage.getItem(ACTIVATION_PROJECT_KEY);
      if (activationProject === projectId) {
        setVisible(true);
        track("activation_plan_viewed", { organizationId, workspaceId, projectId });
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
      localStorage.removeItem(ACTIVATION_PROJECT_KEY);
    } catch {
      // ignore
    }
    track("activation_guide_dismissed", { organizationId, workspaceId, projectId });
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 w-80 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="rounded-xl border border-indigo-100 bg-white p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-900">
            Quick tips
          </span>
          <button
            onClick={dismiss}
            className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Dismiss tips"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="space-y-3">
          {HINTS.map((h, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                {h.icon}
              </div>
              <span className="text-sm text-gray-600 leading-relaxed">
                {h.text}
              </span>
            </li>
          ))}
        </ul>
        <button
          onClick={dismiss}
          className="mt-4 w-full rounded-lg bg-indigo-600 py-2 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
