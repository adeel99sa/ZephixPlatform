/**
 * Phase 4 (2026-04-08) — Phase rollup helper invariants.
 *
 * Pure-function tests over `computePhaseRollup`. Edge cases for empty
 * children, missing dates, mixed statuses, and the operator's mockup
 * example (Ideation Phase 5/6 closed = 83%) which also exercises the
 * frontend statusBucket helper end-to-end.
 */
import { describe, it, expect } from 'vitest';
import { computePhaseRollup } from '../phaseRollups';
import type { WorkTask } from '../../../work-management/workTasks.api';

// Minimal task factory — only the fields the rollup reads.
function makeTask(overrides: Partial<WorkTask>): WorkTask {
  return {
    id: 't-' + Math.random().toString(36).slice(2, 8),
    projectId: 'p',
    workspaceId: 'w',
    title: 'task',
    status: 'TODO',
    priority: 'MEDIUM',
    type: 'TASK',
    assigneeUserId: null,
    reporterUserId: null,
    parentTaskId: null,
    phaseId: null,
    rank: 0,
    startDate: null,
    dueDate: null,
    isMilestone: false,
    approvalStatus: 'not_required',
    documentRequired: false,
    remarks: null,
    deletedAt: null,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
    ...overrides,
  } as WorkTask;
}

describe('computePhaseRollup', () => {
  it('returns zero rollup for an empty phase', () => {
    expect(computePhaseRollup([])).toEqual({
      taskCount: 0,
      durationDays: 0,
      completionPercent: 0,
    });
  });

  it('counts direct children only', () => {
    const r = computePhaseRollup([
      makeTask({}),
      makeTask({}),
      makeTask({}),
    ]);
    expect(r.taskCount).toBe(3);
  });

  it('computes span from earliest start to latest due, inclusive', () => {
    // Earliest start 2026-04-01, latest due 2026-04-10 → 10 days inclusive
    const r = computePhaseRollup([
      makeTask({ startDate: '2026-04-01', dueDate: '2026-04-03' }),
      makeTask({ startDate: '2026-04-05', dueDate: '2026-04-10' }),
    ]);
    expect(r.durationDays).toBe(10);
  });

  it('returns 0 duration when no child has both dates set', () => {
    const r = computePhaseRollup([
      makeTask({ startDate: '2026-04-01', dueDate: null }),
      makeTask({ startDate: null, dueDate: null }),
    ]);
    expect(r.durationDays).toBe(0);
  });

  it('still computes a span when some children have only one date', () => {
    // One child has startDate, another has dueDate — span uses both
    const r = computePhaseRollup([
      makeTask({ startDate: '2026-04-01', dueDate: null }),
      makeTask({ startDate: null, dueDate: '2026-04-05' }),
    ]);
    // 2026-04-01 to 2026-04-05 = 5 days inclusive
    expect(r.durationDays).toBe(5);
  });

  it('rolls up completion from the closed status bucket', () => {
    // 2 of 3 closed → 67%
    const r = computePhaseRollup([
      makeTask({ status: 'DONE' }),
      makeTask({ status: 'CANCELED' }),
      makeTask({ status: 'IN_PROGRESS' }),
    ]);
    expect(r.completionPercent).toBe(67);
  });

  it('matches the operator mockup: Ideation Phase 5/6 closed = 83%', () => {
    // Reference example from the ClickUp Waterfall mockup the operator
    // shared on 2026-04-08. Verifies the helper produces the canonical
    // benchmark percentage.
    const r = computePhaseRollup([
      makeTask({
        status: 'DONE',
        startDate: '2026-04-01',
        dueDate: '2026-04-02',
      }),
      makeTask({
        status: 'DONE',
        startDate: '2026-04-01',
        dueDate: '2026-04-02',
      }),
      makeTask({
        status: 'DONE',
        startDate: '2026-04-01',
        dueDate: '2026-04-02',
      }),
      makeTask({
        status: 'DONE',
        startDate: '2026-04-01',
        dueDate: '2026-04-02',
      }),
      makeTask({
        status: 'DONE',
        startDate: '2026-04-01',
        dueDate: '2026-04-02',
      }),
      makeTask({
        status: 'TODO',
        startDate: '2026-04-01',
        dueDate: '2026-04-03',
      }),
    ]);
    expect(r.taskCount).toBe(6);
    expect(r.completionPercent).toBe(83);
    // 2026-04-01 → 2026-04-03 inclusive = 3 days
    expect(r.durationDays).toBe(3);
  });
});
