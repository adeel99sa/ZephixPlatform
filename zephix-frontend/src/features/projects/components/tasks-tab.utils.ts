import type {
  WorkPhaseListItem,
  WorkPhaseState,
  WorkTask,
  WorkTaskEffectiveState,
  WorkTaskStatus,
} from "@/features/work-management/workTasks.api";

const TERMINAL: ReadonlySet<WorkTaskStatus> = new Set(["DONE", "CANCELED"]);

/** Phase header badge (includes FROZEN from engine). */
export type PhaseBadgeStatus = "ACTIVE" | "LOCKED" | "COMPLETE" | "FROZEN";

/**
 * Derives phase header badge from `phase_state` with legacy fallbacks.
 *
 * **COMPLETE inference:** Only when there is at least one task and every task
 * is terminal. If `phase_state` is ACTIVE and there are **no** tasks, this
 * stays ACTIVE (never treat an empty phase as complete).
 */
export function derivePhaseBadgeStatus(
  phase: WorkPhaseListItem | null,
  tasksInPhase: WorkTask[],
): PhaseBadgeStatus {
  if (!phase) {
    return "ACTIVE";
  }
  const ps = phase.phaseState;
  if (ps === "LOCKED") {
    return "LOCKED";
  }
  if (ps === "FROZEN") {
    return "FROZEN";
  }
  if (ps === "COMPLETE") {
    return "COMPLETE";
  }
  if (phase.isLocked) {
    return "LOCKED";
  }
  // Legacy: infer COMPLETE only when there is work in the phase and it is all done.
  if (tasksInPhase.length === 0) {
    return "ACTIVE";
  }
  if (tasksInPhase.every((t) => TERMINAL.has(t.status))) {
    return "COMPLETE";
  }
  return "ACTIVE";
}

/**
 * True when new tasks may be added to this phase (engine + inferred complete).
 */
export function isPhaseAddTaskAllowed(
  phase: WorkPhaseListItem | null,
  tasksInPhase: WorkTask[],
): boolean {
  return derivePhaseBadgeStatus(phase, tasksInPhase) === "ACTIVE";
}

/**
 * Maps phase + persisted task status to the operational effective state.
 *
 * **Precedence (must stay in this order — matches backend engine):**
 * 1. `FROZEN` — schedule / governance freeze (when exposed via phase state)
 * 2. `LOCKED` — phase-level lock
 * 3. `COMPLETE` → `ARCHIVED` — phase closed; tasks are read-only in UI
 * 4. Fallback — `status` (persisted task workflow state)
 *
 * Project-level freezes should still surface as `FROZEN` via `phaseState` when
 * the API wires them through the same column.
 */
export function computeTaskEffectiveState(
  phaseState: WorkPhaseState | null | undefined,
  status: WorkTaskStatus,
): WorkTaskEffectiveState {
  if (phaseState === "FROZEN") {
    return "FROZEN";
  }
  if (phaseState === "LOCKED") {
    return "LOCKED";
  }
  if (phaseState === "COMPLETE") {
    return "ARCHIVED";
  }
  return status;
}

/**
 * Resolves effective state for UI using the same phase badge as the header
 * (so inferred COMPLETE still yields ARCHIVED tasks).
 */
export function getTaskEffectiveStateForUi(
  task: WorkTask,
  phase: WorkPhaseListItem | null,
  phaseDisplay: PhaseBadgeStatus,
): WorkTaskEffectiveState {
  if (task.effectiveState != null) {
    return task.effectiveState;
  }
  if (!phase) {
    return computeTaskEffectiveState(null, task.status);
  }
  const coerce: WorkPhaseState | null =
    phaseDisplay === "COMPLETE"
      ? "COMPLETE"
      : phaseDisplay === "LOCKED"
        ? "LOCKED"
        : phaseDisplay === "FROZEN"
          ? "FROZEN"
          : phase.phaseState ?? "ACTIVE";
  return computeTaskEffectiveState(coerce, task.status);
}

export function formatTaskDueDate(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatEffectiveStateLabel(s: WorkTaskEffectiveState): string {
  return String(s).replace(/_/g, " ");
}

export function effectiveStateDotClass(s: WorkTaskEffectiveState): string {
  switch (s) {
    case "DONE":
      return "bg-emerald-500";
    case "IN_PROGRESS":
    case "IN_REVIEW":
      return "bg-indigo-500";
    case "BLOCKED":
      return "bg-amber-500";
    case "CANCELED":
      return "bg-slate-400";
    case "BACKLOG":
    case "TODO":
    case "PENDING":
      return "bg-slate-300";
    case "REWORK":
      return "bg-rose-500";
    case "ARCHIVED":
      return "bg-slate-400";
    case "FROZEN":
      return "bg-sky-400";
    case "LOCKED":
      return "bg-slate-500";
    default:
      return "bg-slate-400";
  }
}

export function priorityFlagClass(
  priority: WorkTask["priority"],
): { text: string; label: string } {
  switch (priority) {
    case "CRITICAL":
      return { text: "text-rose-600", label: "Critical" };
    case "HIGH":
      return { text: "text-amber-600", label: "High" };
    case "MEDIUM":
      return { text: "text-slate-600", label: "Medium" };
    case "LOW":
    default:
      return { text: "text-slate-400", label: "Low" };
  }
}
