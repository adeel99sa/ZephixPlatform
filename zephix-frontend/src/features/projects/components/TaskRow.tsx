import type { ReactElement } from "react";
import { AlertTriangle, Flag, Shield, UserRound } from "lucide-react";

import type {
  WorkTask,
  WorkTaskEffectiveState,
} from "@/features/work-management/workTasks.api";
import {
  formatEffectiveStateLabel,
  formatTaskDueDate,
  priorityFlagClass,
  effectiveStateDotClass,
} from "./tasks-tab.utils";
import { cn } from "@/lib/utils";

export type TaskRowPhaseTone = "default" | "locked" | "complete";

export type TaskRowProps = {
  task: WorkTask;
  /** Must come from engine rules (phase + status); never use raw `task.status` alone for governed rows. */
  effectiveState: WorkTaskEffectiveState;
  assigneeLabel?: string;
  assigneeInitials?: string;
  phaseTone?: TaskRowPhaseTone;
  /**
   * C-6: When true, project lifecycle freezes work (`ON_HOLD` / `TERMINATED` from backend `Project.state`).
   * All future row affordances (menus, drag handles, inline edit) must honor this — do not bypass.
   */
  surfaceInteractionLocked?: boolean;
};

const CONDITION_TOOLTIP =
  "Created from gate approval. Must be completed.";

export function TaskRow({
  task,
  effectiveState,
  assigneeLabel,
  assigneeInitials,
  phaseTone = "default",
  surfaceInteractionLocked = false,
}: TaskRowProps): ReactElement {
  const pr = priorityFlagClass(task.priority);
  const showReworkBadge =
    Boolean(task.isReworkTask) || effectiveState === "REWORK";

  return (
    <div
      data-task-id={task.id}
      data-surface-interaction-locked={surfaceInteractionLocked ? "true" : undefined}
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_96px_88px_104px_96px_32px] items-center gap-3 border-b border-slate-100 px-3 py-2.5 transition-colors",
        task.isConditionTask && "border-l-2 border-l-amber-400 bg-amber-50/40",
        phaseTone === "default" && !surfaceInteractionLocked && "hover:bg-slate-50/80",
        phaseTone === "locked" && "opacity-70",
        phaseTone === "complete" && "bg-slate-50/80 text-slate-600",
        surfaceInteractionLocked && "pointer-events-none select-none",
      )}
      role="row"
      aria-disabled={surfaceInteractionLocked ? true : undefined}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex min-w-0 items-start gap-2">
          <span
            className={cn(
              "mt-1.5 h-2 w-2 shrink-0 rounded-full",
              effectiveStateDotClass(effectiveState),
            )}
            aria-hidden
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex min-w-0 items-center gap-1.5">
              {task.isGateArtifact ? (
                <Shield
                  className="h-4 w-4 shrink-0 text-indigo-600"
                  aria-label="Gate deliverable"
                />
              ) : null}
              {task.isConditionTask ? (
                <span
                  className="inline-flex shrink-0"
                  title={CONDITION_TOOLTIP}
                >
                  <AlertTriangle
                    className="h-4 w-4 text-amber-600"
                    aria-hidden
                  />
                  <span className="sr-only">{CONDITION_TOOLTIP}</span>
                </span>
              ) : null}
              {task.isConditionTask ? (
                <span className="shrink-0 rounded border border-amber-300/80 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                  Condition
                </span>
              ) : null}
              {showReworkBadge ? (
                <span
                  className="shrink-0 rounded border border-amber-200/90 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950"
                  title="Created from recycled gate review"
                >
                  Rework
                </span>
              ) : null}
              <span className="truncate text-sm font-medium text-slate-900">
                {task.title}
              </span>
            </div>
            {task.isConditionTask && task.sourceGateName ? (
              <p className="truncate pl-5 text-[11px] text-slate-600">
                From Gate: {task.sourceGateName}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        {assigneeInitials ? (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-800"
            title={assigneeLabel}
          >
            {assigneeInitials}
          </span>
        ) : (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-slate-200 text-slate-300"
            title="Unassigned"
            aria-label="Unassigned"
          >
            <UserRound className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>

      <div className="text-sm text-slate-600">
        {formatTaskDueDate(task.dueDate)}
      </div>

      <div className="truncate text-sm text-slate-700">
        {formatEffectiveStateLabel(effectiveState)}
      </div>

      <div className="flex items-center gap-1.5 text-sm">
        <Flag className={cn("h-4 w-4 shrink-0", pr.text)} aria-hidden />
        <span className={cn("truncate", pr.text)}>{pr.label}</span>
      </div>

      <div className="min-h-1" aria-hidden />
    </div>
  );
}
