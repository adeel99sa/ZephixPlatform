import type { WorkTaskEffectiveState } from "@/features/work-management/workTasks.api";

/**
 * C-4: Rows passed into {@link GateSubmitModal} — prepared by the parent from live task data.
 */
export type GateSubmitArtifactRow = {
  id: string;
  name: string;
  effectiveState: WorkTaskEffectiveState;
  dueDate: string | null;
  assigneeLabel?: string;
  assigneeInitials?: string;
};

export type GateSubmitApproverRow = {
  id: string;
  name: string;
  roleLabel: string | null;
};
