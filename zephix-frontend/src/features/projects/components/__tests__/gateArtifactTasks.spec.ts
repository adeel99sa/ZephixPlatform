import { describe, it, expect } from "vitest";

import type { WorkPhaseListItem, WorkTask } from "@/features/work-management/workTasks.api";

import { selectCompletedGateArtifactTasksForSubmit } from "../gateArtifactTasks";

function task(
  partial: Partial<WorkTask> & Pick<WorkTask, "id" | "phaseId">,
): WorkTask {
  const base: WorkTask = {
    id: partial.id,
    organizationId: "o",
    workspaceId: "w",
    projectId: "p",
    parentTaskId: null,
    phaseId: partial.phaseId,
    title: partial.title ?? "t",
    description: null,
    status: partial.status ?? "TODO",
    type: "TASK",
    priority: "MEDIUM",
    assigneeUserId: null,
    reporterUserId: null,
    startDate: null,
    dueDate: null,
    completedAt: null,
    estimatePoints: null,
    estimateHours: null,
    remainingHours: null,
    actualHours: null,
    actualStartDate: null,
    actualEndDate: null,
    iterationId: null,
    committed: false,
    rank: null,
    tags: null,
    metadata: null,
    acceptanceCriteria: [],
    createdAt: "",
    updatedAt: "",
    deletedAt: null,
    deletedByUserId: null,
    isGateArtifact: partial.isGateArtifact ?? false,
    isConditionTask: false,
    sourceGateConditionId: null,
    effectiveState: partial.effectiveState,
  };
  return base;
}

const phase: WorkPhaseListItem = {
  id: "ph-1",
  name: "P1",
  sortOrder: 1,
  reportingKey: "p1",
  isMilestone: false,
  isLocked: false,
  dueDate: null,
  phaseState: "ACTIVE",
};

describe("selectCompletedGateArtifactTasksForSubmit", () => {
  it("excludes non-artifact tasks", () => {
    const rows = selectCompletedGateArtifactTasksForSubmit(
      [
        task({
          id: "t1",
          phaseId: "ph-1",
          isGateArtifact: false,
          status: "DONE",
        }),
      ],
      phase,
    );
    expect(rows).toHaveLength(0);
  });

  it("excludes gate-artifact tasks that are not terminal complete (DONE / ARCHIVED via UI)", () => {
    const rows = selectCompletedGateArtifactTasksForSubmit(
      [
        task({
          id: "t1",
          phaseId: "ph-1",
          isGateArtifact: true,
          status: "IN_PROGRESS",
        }),
      ],
      phase,
    );
    expect(rows).toHaveLength(0);
  });

  it("includes completed gate-artifact tasks (DONE)", () => {
    const rows = selectCompletedGateArtifactTasksForSubmit(
      [
        task({
          id: "ga-1",
          phaseId: "ph-1",
          title: "Artifact A",
          isGateArtifact: true,
          status: "DONE",
        }),
      ],
      phase,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("ga-1");
    expect(rows[0]?.name).toBe("Artifact A");
  });
});
