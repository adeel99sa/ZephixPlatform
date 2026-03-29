import { describe, it, expect } from 'vitest';
import { buildTaskListSections } from '../taskListPhaseGrouping';
import type { WorkTask } from '@/features/work-management/workTasks.api';

function task(partial: Partial<WorkTask> & Pick<WorkTask, 'id' | 'phaseId'>): WorkTask {
  const base: WorkTask = {
    id: partial.id,
    organizationId: 'o',
    workspaceId: 'w',
    projectId: 'p',
    parentTaskId: null,
    phaseId: partial.phaseId,
    title: partial.title ?? 't',
    description: null,
    status: partial.status ?? 'TODO',
    type: 'TASK',
    priority: 'MEDIUM',
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
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    deletedByUserId: null,
    isGateArtifact: partial.isGateArtifact ?? false,
    isConditionTask: partial.isConditionTask ?? false,
    sourceGateConditionId: partial.sourceGateConditionId ?? null,
  };
  return base;
}

describe('buildTaskListSections', () => {
  it('places unassigned tasks first, then phases by sortOrder', () => {
    const phases = [
      {
        id: 'ph-b',
        name: 'Beta',
        sortOrder: 2,
        reportingKey: 'b',
        isMilestone: false,
        isLocked: false,
        dueDate: null,
      },
      {
        id: 'ph-a',
        name: 'Alpha',
        sortOrder: 1,
        reportingKey: 'a',
        isMilestone: true,
        isLocked: false,
        dueDate: null,
      },
    ];
    const tasks = [
      task({ id: '1', phaseId: null, title: 'No phase' }),
      task({ id: '2', phaseId: 'ph-a', title: 'In alpha' }),
      task({ id: '3', phaseId: 'ph-b', title: 'In beta' }),
    ];
    const sections = buildTaskListSections(phases, tasks);
    expect(sections[0]?.kind).toBe('unassigned');
    expect(sections[0]?.kind === 'unassigned' && sections[0].tasks.map((t) => t.id)).toEqual(['1']);
    expect(sections[1]?.kind).toBe('phase');
    expect(sections[1]?.kind === 'phase' && sections[1].phase.id).toBe('ph-a');
    expect(sections[2]?.kind === 'phase' && sections[2].phase.id).toBe('ph-b');
  });

  it('groups unknown phase ids with unassigned', () => {
    const phases = [
      {
        id: 'ph-a',
        name: 'Alpha',
        sortOrder: 1,
        reportingKey: 'a',
        isMilestone: false,
        isLocked: false,
        dueDate: null,
      },
    ];
    const tasks = [task({ id: 'x', phaseId: 'missing-phase', title: 'orphan' })];
    const sections = buildTaskListSections(phases, tasks);
    expect(sections).toHaveLength(2);
    expect(sections[0]?.kind).toBe('unassigned');
    expect(sections[0]?.kind === 'unassigned' && sections[0].tasks).toHaveLength(1);
  });
});
