import { useState, type ReactElement } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import {
  derivePhaseBadgeStatus,
  getTaskEffectiveStateForUi,
  isPhaseAddTaskAllowed,
  type PhaseBadgeStatus,
} from "./tasks-tab.utils";
import type { InlinePhaseGate } from "./inline-phase-gate.types";
import { InlineGateRow } from "./InlineGateRow";
import { TaskListColumnHeaders } from "./TaskListColumnHeaders";
import { TaskRow, type TaskRowPhaseTone } from "./TaskRow";

import type { WorkPhaseListItem, WorkTask } from "@/features/work-management/workTasks.api";
import { cn } from "@/lib/utils";

export type AssigneeLookup = Map<
  string,
  { label: string; initials: string }
>;

export type PhaseGroupSurfaceTone = "default" | "on_hold" | "terminated";

export type PhaseGroupProps = {
  phase: WorkPhaseListItem | null;
  phaseLabel: string;
  tasks: WorkTask[];
  assigneeLookup: AssigneeLookup;
  /** When set, phase allows inline add (parent must not pass for locked/complete phases). */
  onRequestAddTask?: () => void;
  /** C-3: backend-shaped gate; render only when non-null (not derived in UI). */
  inlineGate?: InlinePhaseGate | null;
  /** C-4: Opens submit-for-review modal when gate is READY. */
  onRequestGateSubmit?: () => void;
  /** C-5: Opens gate decision modal when gate is IN_REVIEW. */
  onRequestGateReview?: () => void;
  /** C-7: Opens read-only gate record (DECIDED — View Record). */
  onRequestGateRecord?: () => void;
  /** C-7: Opens same record surface (IN_REVIEW — View History when prior cycles exist). */
  onRequestGateHistory?: () => void;
  /** C-6: from backend project state — presentation only. */
  surfaceTone?: PhaseGroupSurfaceTone;
  /** C-6: from gate `cycleNumber` when backend provides and value &gt; 1 (recycle). */
  cycleBadgeNumber?: number | null;
  /** C-6: pass through to TaskRow — blocks future row affordances when project lifecycle freezes work. */
  surfaceInteractionLocked?: boolean;
  defaultCollapsed?: boolean;
};

function phaseBadgeClass(status: PhaseBadgeStatus): string {
  switch (status) {
    case "LOCKED":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "FROZEN":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "COMPLETE":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "ACTIVE":
    default:
      return "border-blue-200 bg-blue-50 text-blue-800";
  }
}

function taskCountLabel(n: number): string {
  if (n === 1) {
    return "1 task";
  }
  return `${n} tasks`;
}

function rowToneFromDisplay(display: PhaseBadgeStatus): TaskRowPhaseTone {
  if (display === "COMPLETE") {
    return "complete";
  }
  if (display === "LOCKED" || display === "FROZEN") {
    return "locked";
  }
  return "default";
}

/**
 * Collapsible phase section with column headers and task rows (C-2; no gate strip).
 */
export function PhaseGroup({
  phase,
  phaseLabel,
  tasks,
  assigneeLookup,
  onRequestAddTask,
  inlineGate = null,
  onRequestGateSubmit,
  onRequestGateReview,
  onRequestGateRecord,
  onRequestGateHistory,
  surfaceTone = "default",
  cycleBadgeNumber,
  surfaceInteractionLocked = false,
  defaultCollapsed = false,
}: PhaseGroupProps): ReactElement {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const display = derivePhaseBadgeStatus(phase, tasks);
  const inlineAddAllowed =
    Boolean(onRequestAddTask) &&
    (phase === null
      ? tasks.length === 0
      : isPhaseAddTaskAllowed(phase, tasks));

  const surfaceToneClass =
    surfaceTone === "on_hold"
      ? "border-amber-200/90 bg-amber-50/30"
      : surfaceTone === "terminated"
        ? "border-red-200/80 bg-red-50/25"
        : "border-slate-200 bg-white";

  const showCycleBadge =
    typeof cycleBadgeNumber === "number" &&
    cycleBadgeNumber > 1;

  const conditionTasks = tasks.filter((t) => t.isConditionTask);
  const nonConditionTasks = tasks.filter((t) => !t.isConditionTask);

  return (
    <section
      className={cn(
        "mb-4 overflow-hidden rounded-lg border shadow-sm",
        surfaceToneClass,
      )}
      aria-label={`Phase ${phaseLabel}`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-2 border-b border-slate-100 bg-slate-50/90 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
        aria-expanded={!collapsed}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        )}
        <span className="text-sm font-semibold text-slate-900">{phaseLabel}</span>
        <span
          className={cn(
            "rounded-md border px-2 py-0.5 text-xs font-medium",
            phaseBadgeClass(display),
          )}
        >
          {display}
        </span>
        {showCycleBadge ? (
          <span
            className="rounded-md border border-amber-200/90 bg-amber-50/90 px-2 py-0.5 text-xs font-medium text-amber-950"
            title="Rework required from previous gate decision"
          >
            Cycle {cycleBadgeNumber}
            <span className="ml-1.5 font-normal text-amber-900/90">
              — Rework from prior decision
            </span>
          </span>
        ) : null}
        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
          {taskCountLabel(tasks.length)}
        </span>
      </button>

      {!collapsed && (
        <div>
          <TaskListColumnHeaders />
          {tasks.length === 0 ? (
            <div className="flex flex-col items-start gap-2 px-3 py-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">No tasks in this phase.</p>
              {inlineAddAllowed ? (
                <button
                  type="button"
                  onClick={onRequestAddTask}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  + Add task
                </button>
              ) : null}
            </div>
          ) : (
            <>
              {conditionTasks.length > 0 ? (
                <div
                  className="border-b border-amber-100 bg-amber-50/70 px-3 py-2"
                  role="presentation"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-950">
                    Gate Conditions
                  </p>
                </div>
              ) : null}
              {conditionTasks.map((task) => {
                const a = task.assigneeUserId
                  ? assigneeLookup.get(task.assigneeUserId)
                  : undefined;
                const tone = rowToneFromDisplay(display);
                return (
                  <TaskRow
                    key={task.id}
                    task={task}
                    effectiveState={getTaskEffectiveStateForUi(
                      task,
                      phase,
                      display,
                    )}
                    assigneeLabel={a?.label}
                    assigneeInitials={a?.initials}
                    phaseTone={tone}
                    surfaceInteractionLocked={surfaceInteractionLocked}
                  />
                );
              })}
              {nonConditionTasks.length > 0 && conditionTasks.length > 0 ? (
                <div
                  className="border-b border-slate-100 bg-slate-50/60 px-3 py-1.5"
                  role="presentation"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    Tasks
                  </p>
                </div>
              ) : null}
              {nonConditionTasks.map((task) => {
                const a = task.assigneeUserId
                  ? assigneeLookup.get(task.assigneeUserId)
                  : undefined;
                const tone = rowToneFromDisplay(display);
                return (
                  <TaskRow
                    key={task.id}
                    task={task}
                    effectiveState={getTaskEffectiveStateForUi(
                      task,
                      phase,
                      display,
                    )}
                    assigneeLabel={a?.label}
                    assigneeInitials={a?.initials}
                    phaseTone={tone}
                    surfaceInteractionLocked={surfaceInteractionLocked}
                  />
                );
              })}
            </>
          )}
          {inlineGate ? (
            <InlineGateRow
              gate={inlineGate}
              onRequestSubmitForReview={
                inlineGate.state === "READY" ? onRequestGateSubmit : undefined
              }
              onRequestViewDetails={
                inlineGate.state === "IN_REVIEW" ? onRequestGateReview : undefined
              }
              onRequestViewRecord={
                inlineGate.state === "DECIDED" ? onRequestGateRecord : undefined
              }
              onRequestViewHistory={onRequestGateHistory}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
