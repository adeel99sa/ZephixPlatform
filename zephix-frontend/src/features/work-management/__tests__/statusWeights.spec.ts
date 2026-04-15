import { describe, it, expect } from 'vitest';
import {
  getTaskStatusWeight,
  computeWeightedCompletionPercent,
  computeTaskCompletion,
  computeProjectCompletionPercent,
} from '../statusWeights';
import type { WorkTask } from '../workTasks.api';

function baseTask(overrides: Partial<WorkTask>): WorkTask {
  return {
    id: 't1',
    organizationId: 'o1',
    workspaceId: 'w1',
    projectId: 'p1',
    parentTaskId: null,
    phaseId: null,
    title: 'Task',
    description: null,
    status: 'TODO',
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
    rank: 0,
    tags: null,
    metadata: null,
    acceptanceCriteria: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    deletedAt: null,
    deletedByUserId: null,
    approvalStatus: 'not_required',
    documentRequired: false,
    remarks: null,
    isMilestone: false,
    ...overrides,
  };
}

describe('statusWeights', () => {
  describe('getTaskStatusWeight', () => {
    it('returns 0 for BACKLOG and TODO', () => {
      expect(getTaskStatusWeight('BACKLOG')).toBe(0);
      expect(getTaskStatusWeight('TODO')).toBe(0);
    });

    it('returns 50 for IN_PROGRESS and BLOCKED', () => {
      expect(getTaskStatusWeight('IN_PROGRESS')).toBe(50);
      expect(getTaskStatusWeight('BLOCKED')).toBe(50);
    });

    it('returns 75 for IN_REVIEW', () => {
      expect(getTaskStatusWeight('IN_REVIEW')).toBe(75);
    });

    it('returns 100 for DONE', () => {
      expect(getTaskStatusWeight('DONE')).toBe(100);
    });

    it('returns -1 for CANCELED (excluded)', () => {
      expect(getTaskStatusWeight('CANCELED')).toBe(-1);
    });

    it('treats CANCELLED spelling as excluded', () => {
      expect(getTaskStatusWeight('CANCELLED')).toBe(-1);
    });

    it('returns 0 for unknown status', () => {
      expect(getTaskStatusWeight('UNKNOWN')).toBe(0);
    });
  });

  describe('case normalization', () => {
    it('handles lowercase snake_case', () => {
      expect(getTaskStatusWeight('in_progress')).toBe(50);
      expect(getTaskStatusWeight('todo')).toBe(0);
      expect(getTaskStatusWeight('done')).toBe(100);
    });

    it('handles UPPERCASE unchanged', () => {
      expect(getTaskStatusWeight('IN_PROGRESS')).toBe(50);
      expect(getTaskStatusWeight('DONE')).toBe(100);
    });

    it('handles human labels with spaces', () => {
      expect(getTaskStatusWeight('In progress')).toBe(50);
      expect(getTaskStatusWeight('To do')).toBe(0);
      expect(getTaskStatusWeight('In review')).toBe(75);
    });

    it('computeWeightedCompletionPercent handles mixed-case payloads', () => {
      const statuses = ['done', 'in_progress', 'todo', 'done', 'done', 'done'];
      expect(computeWeightedCompletionPercent(statuses)).toBe(75);
    });
  });

  describe('computeWeightedCompletionPercent', () => {
    it('returns 0 for empty array', () => {
      expect(computeWeightedCompletionPercent([])).toBe(0);
    });

    it('returns 0 for all TODO tasks', () => {
      expect(computeWeightedCompletionPercent(['TODO', 'TODO', 'TODO'])).toBe(0);
    });

    it('returns 100 for all DONE tasks', () => {
      expect(computeWeightedCompletionPercent(['DONE', 'DONE', 'DONE'])).toBe(100);
    });

    it('returns 50 for mixed TODO/DONE', () => {
      expect(computeWeightedCompletionPercent(['TODO', 'DONE'])).toBe(50);
    });

    it('calculates weighted average correctly', () => {
      expect(computeWeightedCompletionPercent(['TODO', 'IN_PROGRESS', 'DONE'])).toBe(50);
    });

    it('handles IN_REVIEW weight', () => {
      expect(computeWeightedCompletionPercent(['IN_REVIEW', 'DONE'])).toBe(88);
    });

    it('excludes CANCELED from calculation', () => {
      expect(computeWeightedCompletionPercent(['TODO', 'DONE', 'CANCELED'])).toBe(50);
    });

    it('returns 0 when all tasks are CANCELED', () => {
      expect(computeWeightedCompletionPercent(['CANCELED', 'CANCELED'])).toBe(0);
    });

    it('matches ClickUp 83% scenario — 5 of 6 DONE, 1 TODO', () => {
      const statuses = ['DONE', 'DONE', 'DONE', 'DONE', 'DONE', 'TODO'];
      expect(computeWeightedCompletionPercent(statuses)).toBe(83);
    });

    it('shows advantage over 0/100 — IN_PROGRESS gives partial credit', () => {
      const statuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
      expect(computeWeightedCompletionPercent(statuses)).toBe(56);
    });
  });

  describe('computeTaskCompletion', () => {
    it('uses task status when no subtasks', () => {
      expect(computeTaskCompletion('IN_PROGRESS')).toBe(50);
    });

    it('uses subtask average when subtasks exist', () => {
      expect(computeTaskCompletion('TODO', ['DONE', 'TODO'])).toBe(50);
    });

    it('ignores parent status when subtasks exist', () => {
      expect(computeTaskCompletion('TODO', ['DONE', 'DONE'])).toBe(100);
    });
  });

  describe('computeProjectCompletionPercent', () => {
    it('returns 0 for empty tasks', () => {
      expect(computeProjectCompletionPercent([])).toBe(0);
    });

    it('averages root tasks with subtask rollups', () => {
      const parent = baseTask({ id: 'p', status: 'TODO' });
      const c1 = baseTask({ id: 'c1', parentTaskId: 'p', status: 'DONE' });
      const c2 = baseTask({ id: 'c2', parentTaskId: 'p', status: 'TODO' });
      expect(computeProjectCompletionPercent([parent, c1, c2])).toBe(50);
    });
  });
});
