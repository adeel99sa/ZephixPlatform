/**
 * NotEnabledInProject — Phase 2 (Template Center)
 *
 * Controlled state for project tabs that exist as routes but are not part of
 * the MVP visible tab rail. Per HR3, only Overview, Activities, Board, Gantt
 * are visible in the project tab rail. The remaining routes remain registered
 * for direct URL access, but render this honest "not enabled" state instead
 * of exposing unfinished functionality.
 */
import { Lock, ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

interface NotEnabledInProjectProps {
  /** Display name for the feature, e.g. "Risks", "Budget" */
  featureName: string;
  /** Short explanation of what this feature will do */
  description?: string;
}

export function NotEnabledInProject({ featureName, description }: NotEnabledInProjectProps) {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <Lock className="h-6 w-6 text-slate-400" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          {featureName} is not enabled in this project yet
        </h2>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          This feature is part of a future Zephix engine and is not active in the MVP project shell.
        </p>
        <button
          type="button"
          onClick={() => navigate(`/projects/${projectId}`)}
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Overview
        </button>
      </div>
    </div>
  );
}
