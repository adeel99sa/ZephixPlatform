/**
 * Phase 2C: Concurrency test for schedule drag collision.
 * Simulates two concurrent drags on the same task.
 * Validates that at most one commit succeeds under conflict.
 */
import { ScheduleRescheduleService } from '../schedule-reschedule.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ScheduleRescheduleService — Concurrency', () => {
  it('two concurrent drags on same task — only one succeeds under conflict', async () => {
    let commitCount = 0;
    const taskData = {
      id: 'task-1',
      organizationId: 'org-1',
      plannedStartAt: new Date('2026-03-05T00:00:00Z'),
      plannedEndAt: new Date('2026-03-10T00:00:00Z'),
      percentComplete: 0,
      isMilestone: false,
      constraintType: 'asap',
      constraintDate: null,
      title: 'Task 1',
    };

    const taskRepo = {
      findOne: jest.fn().mockResolvedValue({ ...taskData }),
    };

    const depRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    // Simulate transaction that can fail on conflict
    const dataSource = {
      transaction: jest.fn().mockImplementation(async (fn: any) => {
        commitCount++;
        if (commitCount > 1) {
          // Second concurrent transaction fails with conflict
          throw new Error('could not serialize access due to concurrent update');
        }
        const manager = {
          save: jest.fn().mockResolvedValue(taskData),
          findOne: jest.fn().mockResolvedValue(null),
        };
        return fn(manager);
      }),
    };

    const service = new ScheduleRescheduleService(
      taskRepo as any,
      depRepo as any,
      dataSource as any,
      { record: jest.fn().mockResolvedValue({ id: 'evt-1' }) } as any,
    );

    // Launch two concurrent drags
    const drag1 = service.applyGanttDrag({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      taskId: 'task-1',
      plannedStartAt: '2026-03-06T00:00:00Z', // shift forward
      plannedEndAt: '2026-03-11T00:00:00Z',
      cascade: 'none',
    });

    const drag2 = service.applyGanttDrag({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      taskId: 'task-1',
      plannedStartAt: '2026-03-04T00:00:00Z', // shift backward
      plannedEndAt: '2026-03-09T00:00:00Z',
      cascade: 'none',
    });

    const results = await Promise.allSettled([drag1, drag2]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // One succeeds, one fails
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect((rejected[0] as PromiseRejectedResult).reason.message).toContain(
      'concurrent update',
    );
  });

  it('cascade=none with dependency violation blocks write entirely', async () => {
    const taskData = {
      id: 'task-1',
      organizationId: 'org-1',
      plannedStartAt: new Date('2026-03-01T00:00:00Z'),
      plannedEndAt: new Date('2026-03-05T00:00:00Z'),
      percentComplete: 0,
      isMilestone: false,
      constraintType: 'asap',
      constraintDate: null,
      title: 'Task 1',
    };

    const successorTask = {
      id: 'task-2',
      plannedStartAt: new Date('2026-03-03T00:00:00Z'), // starts before task-1 would end at new position
      plannedEndAt: new Date('2026-03-08T00:00:00Z'),
      title: 'Task 2',
    };

    const taskRepo = {
      findOne: jest.fn().mockImplementation(({ where }: any) => {
        if (where.id === 'task-1') return { ...taskData };
        if (where.id === 'task-2') return { ...successorTask };
        return null;
      }),
    };

    const depRepo = {
      find: jest.fn().mockResolvedValue([
        {
          predecessorTaskId: 'task-1',
          successorTaskId: 'task-2',
          type: 'FINISH_TO_START',
          lagMinutes: 0,
        },
      ]),
    };

    const transactionFn = jest.fn();
    const dataSource = { transaction: transactionFn };

    const service = new ScheduleRescheduleService(
      taskRepo as any,
      depRepo as any,
      dataSource as any,
      { record: jest.fn().mockResolvedValue({ id: 'evt-1' }) } as any,
    );

    // Move task-1 end beyond successor start — should cause violation
    await expect(
      service.applyGanttDrag({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        taskId: 'task-1',
        plannedStartAt: '2026-03-01T00:00:00Z',
        plannedEndAt: '2026-03-06T00:00:00Z', // end after successor starts
        cascade: 'none',
      }),
    ).rejects.toThrow(BadRequestException);

    // Transaction must NOT have been called
    expect(transactionFn).not.toHaveBeenCalled();
  });
});
