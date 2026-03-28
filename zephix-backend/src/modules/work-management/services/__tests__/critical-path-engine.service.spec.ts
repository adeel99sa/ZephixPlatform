import { CriticalPathEngineService, CriticalPathResult } from '../critical-path-engine.service';
import { DependencyType } from '../../enums/task.enums';

describe('CriticalPathEngineService', () => {
  let service: CriticalPathEngineService;

  beforeEach(() => {
    // Use the pure computation method — no DB needed
    service = new CriticalPathEngineService(null as any, null as any);
  });

  function makeTask(
    id: string,
    plannedStartAt: string | null,
    plannedEndAt: string | null,
    isMilestone = false,
  ) {
    return {
      id,
      plannedStartAt: plannedStartAt ? new Date(plannedStartAt) : null,
      plannedEndAt: plannedEndAt ? new Date(plannedEndAt) : null,
      actualStartAt: null,
      actualEndAt: null,
      isMilestone,
    };
  }

  function makeDep(
    pred: string,
    succ: string,
    type: DependencyType = DependencyType.FINISH_TO_START,
    lagMinutes = 0,
  ) {
    return {
      predecessorTaskId: pred,
      successorTaskId: succ,
      type,
      lagMinutes,
    };
  }

  it('simple chain FS no lag: A→B→C', () => {
    const tasks = [
      makeTask('A', '2026-03-01T00:00:00Z', '2026-03-02T00:00:00Z'), // 1 day = 1440 min
      makeTask('B', '2026-03-02T00:00:00Z', '2026-03-04T00:00:00Z'), // 2 days = 2880 min
      makeTask('C', '2026-03-04T00:00:00Z', '2026-03-05T00:00:00Z'), // 1 day = 1440 min
    ];
    const deps = [
      makeDep('A', 'B'),
      makeDep('B', 'C'),
    ];

    const result = service.computeFromData(tasks, deps, 'planned');

    expect(result.errors).toHaveLength(0);
    expect(result.criticalPathTaskIds).toContain('A');
    expect(result.criticalPathTaskIds).toContain('B');
    expect(result.criticalPathTaskIds).toContain('C');
    // All tasks critical in a linear chain
    expect(result.criticalPathTaskIds).toHaveLength(3);
  });

  it('parallel paths: chooses longest', () => {
    // Path 1: A (1 day) → C
    // Path 2: B (3 days) → C
    // C depends on both A and B
    const tasks = [
      makeTask('A', '2026-03-01T00:00:00Z', '2026-03-02T00:00:00Z'), // 1 day
      makeTask('B', '2026-03-01T00:00:00Z', '2026-03-04T00:00:00Z'), // 3 days
      makeTask('C', '2026-03-04T00:00:00Z', '2026-03-05T00:00:00Z'), // 1 day
    ];
    const deps = [
      makeDep('A', 'C'),
      makeDep('B', 'C'),
    ];

    const result = service.computeFromData(tasks, deps, 'planned');

    expect(result.errors).toHaveLength(0);
    // B is on the critical path (longer)
    expect(result.criticalPathTaskIds).toContain('B');
    expect(result.criticalPathTaskIds).toContain('C');
    // A has float (not critical)
    const nodeA = result.nodes.get('A')!;
    expect(nodeA.isCritical).toBe(false);
    expect(nodeA.totalFloatMinutes).toBeGreaterThan(0);
  });

  it('SS dependency type', () => {
    const tasks = [
      makeTask('A', '2026-03-01T00:00:00Z', '2026-03-03T00:00:00Z'), // 2 days
      makeTask('B', '2026-03-01T00:00:00Z', '2026-03-02T00:00:00Z'), // 1 day
    ];
    const deps = [
      makeDep('A', 'B', DependencyType.START_TO_START),
    ];

    const result = service.computeFromData(tasks, deps, 'planned');
    expect(result.errors).toHaveLength(0);
    // Both tasks can start at the same time with SS
    const nodeB = result.nodes.get('B')!;
    expect(nodeB.es).toBeLessThanOrEqual(result.nodes.get('A')!.es + 1);
  });

  it('FF dependency type', () => {
    const tasks = [
      makeTask('A', '2026-03-01T00:00:00Z', '2026-03-03T00:00:00Z'), // 2 days
      makeTask('B', '2026-03-01T00:00:00Z', '2026-03-04T00:00:00Z'), // 3 days
    ];
    const deps = [
      makeDep('A', 'B', DependencyType.FINISH_TO_FINISH),
    ];

    const result = service.computeFromData(tasks, deps, 'planned');
    expect(result.errors).toHaveLength(0);
  });

  it('positive lag shifts successor', () => {
    const tasks = [
      makeTask('A', '2026-03-01T00:00:00Z', '2026-03-02T00:00:00Z'), // 1 day
      makeTask('B', '2026-03-03T00:00:00Z', '2026-03-04T00:00:00Z'), // 1 day
    ];
    const deps = [
      makeDep('A', 'B', DependencyType.FINISH_TO_START, 1440), // 1 day lag
    ];

    const result = service.computeFromData(tasks, deps, 'planned');
    expect(result.errors).toHaveLength(0);
    const nodeB = result.nodes.get('B')!;
    const nodeA = result.nodes.get('A')!;
    // B's early start = A's early finish + 1 day lag
    expect(nodeB.es).toBeGreaterThanOrEqual(nodeA.ef + 1440);
  });

  it('negative lag (lead) allows overlap', () => {
    const tasks = [
      makeTask('A', '2026-03-01T00:00:00Z', '2026-03-03T00:00:00Z'), // 2 days
      makeTask('B', '2026-03-02T00:00:00Z', '2026-03-04T00:00:00Z'), // 2 days
    ];
    const deps = [
      makeDep('A', 'B', DependencyType.FINISH_TO_START, -720), // -12 hours lead
    ];

    const result = service.computeFromData(tasks, deps, 'planned');
    expect(result.errors).toHaveLength(0);
    // With lead time, B can start before A finishes
    const nodeB = result.nodes.get('B')!;
    const nodeA = result.nodes.get('A')!;
    expect(nodeB.es).toBeLessThan(nodeA.ef);
  });

  it('milestone duration zero', () => {
    const tasks = [
      makeTask('A', '2026-03-01T00:00:00Z', '2026-03-02T00:00:00Z'), // 1 day
      makeTask('M', '2026-03-02T00:00:00Z', '2026-03-02T00:00:00Z', true), // milestone
      makeTask('B', '2026-03-02T00:00:00Z', '2026-03-03T00:00:00Z'), // 1 day
    ];
    const deps = [
      makeDep('A', 'M'),
      makeDep('M', 'B'),
    ];

    const result = service.computeFromData(tasks, deps, 'planned');
    expect(result.errors).toHaveLength(0);
    const nodeM = result.nodes.get('M')!;
    expect(nodeM.durationMinutes).toBe(0);
    expect(nodeM.es).toEqual(nodeM.ef); // zero duration
  });

  it('cycle detection returns error', () => {
    const tasks = [
      makeTask('A', '2026-03-01T00:00:00Z', '2026-03-02T00:00:00Z'),
      makeTask('B', '2026-03-02T00:00:00Z', '2026-03-03T00:00:00Z'),
    ];
    const deps = [
      makeDep('A', 'B'),
      makeDep('B', 'A'), // cycle!
    ];

    const result = service.computeFromData(tasks, deps, 'planned');
    expect(result.errors).toContain('Cycle detected in task dependency graph');
    expect(result.criticalPathTaskIds).toHaveLength(0);
  });

  it('float calculation correctness — non-critical task has positive float', () => {
    // A(2d) → C(1d)
    // B(1d) → C(1d)
    // B should have float
    const tasks = [
      makeTask('A', '2026-03-01T00:00:00Z', '2026-03-03T00:00:00Z'), // 2 days
      makeTask('B', '2026-03-01T00:00:00Z', '2026-03-02T00:00:00Z'), // 1 day
      makeTask('C', '2026-03-03T00:00:00Z', '2026-03-04T00:00:00Z'), // 1 day
    ];
    const deps = [
      makeDep('A', 'C'),
      makeDep('B', 'C'),
    ];

    const result = service.computeFromData(tasks, deps, 'planned');
    const nodeB = result.nodes.get('B')!;
    expect(nodeB.totalFloatMinutes).toBeGreaterThan(0);
    expect(nodeB.isCritical).toBe(false);
  });

  it('critical task ids stable ordering (follows topological order)', () => {
    const tasks = [
      makeTask('A', '2026-03-01T00:00:00Z', '2026-03-02T00:00:00Z'),
      makeTask('B', '2026-03-02T00:00:00Z', '2026-03-03T00:00:00Z'),
      makeTask('C', '2026-03-03T00:00:00Z', '2026-03-04T00:00:00Z'),
    ];
    const deps = [
      makeDep('A', 'B'),
      makeDep('B', 'C'),
    ];

    const r1 = service.computeFromData(tasks, deps, 'planned');
    const r2 = service.computeFromData(tasks, deps, 'planned');

    expect(r1.criticalPathTaskIds).toEqual(r2.criticalPathTaskIds);
    // All should be in order A, B, C
    expect(r1.criticalPathTaskIds).toEqual(['A', 'B', 'C']);
  });
});
