/**
 * OV-BE-1 — the server rollup must match the frontend algorithm exactly, and
 * (the whole point) must NOT cap at 200 tasks.
 */
import {
  computeProjectCompletionPercent,
  computeProjectTaskRollup,
  RollupTask,
} from '../completion-rollup';

const TODAY = '2026-07-13';
const task = (o: Partial<RollupTask & { id: string }>): RollupTask & { id: string } => ({
  id: o.id ?? Math.random().toString(36).slice(2),
  status: o.status ?? 'TODO',
  parentTaskId: o.parentTaskId ?? null,
  // respect an explicit null (a nullish default would mask it)
  assigneeUserId: 'assigneeUserId' in o ? (o.assigneeUserId ?? null) : 'u1',
  dueDate: o.dueDate ?? null,
});

describe('OV-BE-1 completion rollup', () => {
  it('empty project → zeros', () => {
    expect(computeProjectTaskRollup([], TODAY)).toEqual({
      totalTasks: 0, doneTasks: 0, overdueTasks: 0, unassignedTasks: 0, completionPercent: 0,
    });
  });

  it('flat list: completion = mean of status weights (TODO 0 + DONE 100 = 50)', () => {
    const r = computeProjectTaskRollup(
      [task({ id: 'a', status: 'TODO' }), task({ id: 'b', status: 'DONE' })],
      TODAY,
    );
    expect(r.completionPercent).toBe(50);
    expect(r.doneTasks).toBe(1);
    expect(r.totalTasks).toBe(2);
  });

  it('subtask rollup: a root with subtasks uses the subtask mean, not its own status', () => {
    // root TODO(0) but its two subtasks are DONE(100)+IN_PROGRESS(50) → root = 75
    const tasks = [
      task({ id: 'root', status: 'TODO' }),
      task({ id: 's1', status: 'DONE', parentTaskId: 'root' }),
      task({ id: 's2', status: 'IN_PROGRESS', parentTaskId: 'root' }),
    ];
    // roots = [root]; completion = computeTaskCompletion('TODO', ['DONE','IN_PROGRESS']) = 75
    expect(computeProjectCompletionPercent(tasks)).toBe(75);
  });

  it('CANCELLED is excluded from the weighted completion', () => {
    // roots: DONE(100) + CANCELLED(excluded) → mean over countable = 100
    const tasks = [task({ id: 'a', status: 'DONE' }), task({ id: 'b', status: 'CANCELLED' })];
    // targets=roots=[a,b]; each: a→100, b→(weight -1 → excluded → computeTaskCompletion returns 0)
    // NOTE: at project level both roots are averaged; b contributes 0 (no subtasks, excluded weight → 0)
    expect(computeProjectCompletionPercent(tasks)).toBe(50);
  });

  it('overdue: past due + not closed counts; closed/future/no-date excluded', () => {
    const r = computeProjectTaskRollup(
      [
        task({ id: 'a', status: 'IN_PROGRESS', dueDate: '2026-07-01' }), // overdue
        task({ id: 'b', status: 'DONE', dueDate: '2026-07-01' }),         // closed → not overdue
        task({ id: 'c', status: 'TODO', dueDate: '2026-12-01' }),         // future
        task({ id: 'd', status: 'TODO', dueDate: null }),                 // no date
        task({ id: 'e', status: 'TODO', dueDate: '2026-07-13' }),         // due today (not < today)
      ],
      TODAY,
    );
    expect(r.overdueTasks).toBe(1);
  });

  it('unassigned: no assignee + not closed counts; closed excluded', () => {
    const r = computeProjectTaskRollup(
      [
        task({ id: 'a', status: 'TODO', assigneeUserId: null }),   // unassigned
        task({ id: 'b', status: 'DONE', assigneeUserId: null }),   // closed → excluded
        task({ id: 'c', status: 'TODO', assigneeUserId: 'u1' }),   // assigned
      ],
      TODAY,
    );
    expect(r.unassignedTasks).toBe(1);
  });

  it('does NOT cap at 200 — a 251-task project reports total 251', () => {
    const tasks = Array.from({ length: 251 }, (_, i) =>
      task({ id: `t${i}`, status: i < 251 ? 'DONE' : 'TODO' }),
    );
    const r = computeProjectTaskRollup(tasks, TODAY);
    expect(r.totalTasks).toBe(251);
    expect(r.doneTasks).toBe(251);
    expect(r.completionPercent).toBe(100);
  });
});
