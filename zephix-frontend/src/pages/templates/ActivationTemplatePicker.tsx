/**
 * Activation Template Picker
 *
 * Shown during first-project activation flow.
 * Clean 4-card layout — no sidebar, no filters, no marketplace.
 * Clicking a template immediately creates a project and redirects to the plan view.
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Rocket,
  Briefcase,
  LayoutTemplate,
  FolderOpen,
  ArrowRight,
  Loader2,
} from "lucide-react";

import { createProject } from "@/features/projects/api";
import { useWorkspaceStore } from "@/state/workspace.store";
import { useAuth } from "@/state/AuthContext";
import { track } from "@/lib/telemetry";

/* ─── Activation template definitions (local-only until backend templates exist) ── */

interface ActivationTemplate {
  key: string;
  name: string;
  tagline: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  defaultProjectName: string;
}

const ACTIVATION_TEMPLATES: ActivationTemplate[] = [
  {
    key: "product-launch",
    name: "Product Launch",
    tagline: "Ship features with clear milestones",
    description:
      "Pre-built phases for planning, development, QA, and launch. Great for cross-functional delivery.",
    icon: <Rocket className="h-6 w-6" />,
    color: "bg-blue-50 text-blue-600 border-blue-100",
    defaultProjectName: "Product Launch",
  },
  {
    key: "client-delivery",
    name: "Client Delivery",
    tagline: "Track deliverables and deadlines",
    description:
      "Structured around discovery, execution, and handoff. Perfect for agencies and consultancies.",
    icon: <Briefcase className="h-6 w-6" />,
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    defaultProjectName: "Client Delivery",
  },
  {
    key: "sprint-planning",
    name: "Sprint Planning",
    tagline: "Two-week cycles with backlogs",
    description:
      "Sprint board with backlog, in-progress, review, and done. Built for engineering teams.",
    icon: <LayoutTemplate className="h-6 w-6" />,
    color: "bg-violet-50 text-violet-600 border-violet-100",
    defaultProjectName: "Sprint 1",
  },
  {
    key: "blank",
    name: "Blank Project",
    tagline: "Start from scratch, build your way",
    description:
      "Empty workspace. Add your own phases, tasks, and workflows. Full control from day one.",
    icon: <FolderOpen className="h-6 w-6" />,
    color: "bg-gray-50 text-gray-600 border-gray-100",
    defaultProjectName: "My Project",
  },
];

/* ─── Main component ─────────────────────────────────────────────── */

export default function ActivationTemplatePicker() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const organizationId = user?.organizationId;
  const workspaceId =
    params.get("workspaceId") ||
    useWorkspaceStore.getState().activeWorkspaceId;

  const [creatingKey, setCreatingKey] = useState<string | null>(null);

  /* Telemetry: template picker viewed */
  useEffect(() => {
    track("activation_template_viewed", { organizationId, workspaceId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePick(template: ActivationTemplate) {
    if (creatingKey) return; // prevent double-click
    if (!workspaceId) {
      toast.error("No workspace selected");
      nav("/home");
      return;
    }

    setCreatingKey(template.key);
    track("activation_template_selected", {
      organizationId,
      workspaceId,
      templateKey: template.key,
    });

    try {
      const project = await createProject({
        name: template.defaultProjectName,
        workspaceId,
      });

      const projectId = project.id || (project as any).projectId;
      if (!projectId) throw new Error("Project created but no ID returned");

      track("activation_project_created", {
        organizationId,
        workspaceId,
        projectId,
        templateKey: template.key,
      });

      // Mark activation hint as not-yet-dismissed so guidance overlay shows
      try {
        localStorage.setItem("zephix_activation_project", projectId);
      } catch {
        // ignore
      }

      // Go straight to plan view
      nav(`/projects/${projectId}/plan`, { replace: true });
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Failed to create project",
      );
      setCreatingKey(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            How do you want to start?
          </h1>
          <p className="text-sm text-gray-500">
            Pick a template and your first project will be ready in seconds.
            <br />
            You can change everything later.
          </p>
        </div>

        {/* Template cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ACTIVATION_TEMPLATES.map((t) => {
            const isCreating = creatingKey === t.key;
            const isDisabled = Boolean(creatingKey);
            return (
              <button
                key={t.key}
                onClick={() => handlePick(t)}
                disabled={isDisabled}
                className={`group relative text-left rounded-xl border bg-white p-6 shadow-sm transition-all
                  ${isDisabled && !isCreating ? "opacity-50 cursor-not-allowed" : ""}
                  ${isCreating ? "ring-2 ring-indigo-400 border-indigo-200" : "border-gray-200 hover:shadow-md hover:border-indigo-200"}
                `}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${t.color}`}
                  >
                    {t.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {t.name}
                      </span>
                      {isCreating && (
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                      )}
                    </div>
                    <p className="text-xs font-medium text-gray-500 mb-2">
                      {t.tagline}
                    </p>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {t.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 transition-colors mt-1 shrink-0" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Skip link */}
        <div className="text-center mt-8">
          <button
            onClick={() => nav("/home", { replace: true })}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            disabled={Boolean(creatingKey)}
          >
            Skip — I'll create a project later
          </button>
        </div>
      </div>
    </div>
  );
}
