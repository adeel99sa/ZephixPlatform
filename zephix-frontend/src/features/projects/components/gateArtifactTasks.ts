import {
  derivePhaseBadgeStatus,
  getTaskEffectiveStateForUi,
} from "./tasks-tab.utils";
import type { GateSubmitArtifactRow } from "./gateSubmit.types";

import type { WorkPhaseListItem, WorkTask } from "@/features/work-management/workTasks.api";

/**
 * C-4: Completed gate-artifact tasks only — from the **current** phase task list (no cached snapshots).
 */
export function selectCompletedGateArtifactTasksForSubmit(
  tasksInPhase: WorkTask[],
  phase: WorkPhaseListItem | null,
): GateSubmitArtifactRow[] {
  const phaseDisplay = derivePhaseBadgeStatus(phase, tasksInPhase);
  const rows: GateSubmitArtifactRow[] = [];
  for (const t of tasksInPhase) {
    if (!t.isGateArtifact) {
      continue;
    }
    const eff = getTaskEffectiveStateForUi(t, phase, phaseDisplay);
    const done = eff === "DONE" || eff === "ARCHIVED";
    if (!done) {
      continue;
    }
    rows.push({
      id: t.id,
      name: t.title,
      effectiveState: eff,
      dueDate: t.dueDate,
    });
  }
  return rows;
}
