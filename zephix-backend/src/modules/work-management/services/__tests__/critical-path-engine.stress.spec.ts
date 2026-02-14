/**
 * Phase 2C: Large graph stress test for Critical Path Engine.
 * 1,000 tasks chained linearly. Validates correctness and performance.
 */
import { CriticalPathEngineService } from '../critical-path-engine.service';
import { DependencyType } from '../../enums/task.enums';

describe('CriticalPathEngineService — Stress', () => {
  let service: CriticalPathEngineService;

  beforeAll(() => {
    service = new CriticalPathEngineService(null as any, null as any);
  });

  it('handles 1,000 tasks linear chain in < 250ms', () => {
    const N = 1000;
    const tasks = [];
    const deps = [];

    for (let i = 0; i < N; i++) {
      const start = new Date(`2026-03-01T00:00:00Z`);
      start.setDate(start.getDate() + i);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      tasks.push({
        id: `task-${i}`,
        plannedStartAt: start,
        plannedEndAt: end,
        actualStartAt: null,
        actualEndAt: null,
        isMilestone: false,
      });

      if (i > 0) {
        deps.push({
          predecessorTaskId: `task-${i - 1}`,
          successorTaskId: `task-${i}`,
          type: DependencyType.FINISH_TO_START,
          lagMinutes: 0,
        });
      }
    }

    const startMs = performance.now();
    const result = service.computeFromData(tasks, deps, 'planned');
    const elapsed = performance.now() - startMs;

    // Correctness
    expect(result.errors).toHaveLength(0);
    expect(result.criticalPathTaskIds).toHaveLength(N);
    expect(result.criticalPathTaskIds[0]).toBe('task-0');
    expect(result.criticalPathTaskIds[N - 1]).toBe(`task-${N - 1}`);

    // Performance
    expect(elapsed).toBeLessThan(250);

    // Log for observability
    if (elapsed > 500) {
      console.warn(
        `[PERF WARNING] CPM 1,000 tasks took ${elapsed.toFixed(1)}ms (threshold: 500ms)`,
      );
    }
    console.log(`[PERF] CPM 1,000 linear chain: ${elapsed.toFixed(1)}ms`);
  });

  it('handles 1,000 tasks with parallel branches', () => {
    const N = 1000;
    const tasks = [];
    const deps = [];

    // Create a start node, then 500 parallel branches of 2 tasks each
    tasks.push({
      id: 'start',
      plannedStartAt: new Date('2026-03-01T00:00:00Z'),
      plannedEndAt: new Date('2026-03-02T00:00:00Z'),
      actualStartAt: null,
      actualEndAt: null,
      isMilestone: false,
    });

    for (let i = 0; i < 499; i++) {
      const mid = `mid-${i}`;
      const end = `end-${i}`;
      const startDate = new Date('2026-03-02T00:00:00Z');
      const midDate = new Date(startDate);
      midDate.setDate(midDate.getDate() + (i % 10) + 1);
      const endDate = new Date(midDate);
      endDate.setDate(endDate.getDate() + 1);

      tasks.push({
        id: mid,
        plannedStartAt: startDate,
        plannedEndAt: midDate,
        actualStartAt: null,
        actualEndAt: null,
        isMilestone: false,
      });
      tasks.push({
        id: end,
        plannedStartAt: midDate,
        plannedEndAt: endDate,
        actualStartAt: null,
        actualEndAt: null,
        isMilestone: false,
      });

      deps.push({
        predecessorTaskId: 'start',
        successorTaskId: mid,
        type: DependencyType.FINISH_TO_START,
        lagMinutes: 0,
      });
      deps.push({
        predecessorTaskId: mid,
        successorTaskId: end,
        type: DependencyType.FINISH_TO_START,
        lagMinutes: 0,
      });
    }

    const startMs = performance.now();
    const result = service.computeFromData(tasks, deps, 'planned');
    const elapsed = performance.now() - startMs;

    expect(result.errors).toHaveLength(0);
    expect(result.nodes.size).toBe(tasks.length);
    expect(elapsed).toBeLessThan(500);

    console.log(`[PERF] CPM 1,000 parallel branches: ${elapsed.toFixed(1)}ms`);
  });
});
