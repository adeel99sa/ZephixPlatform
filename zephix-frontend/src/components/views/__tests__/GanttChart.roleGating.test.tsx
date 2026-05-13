/**
 * Week 2 Stream B — GanttChart role-gating tests (taxonomy §3.6 + §5.2).
 *
 * Three roles × Gantt renderer:
 * - Admin / Member (can('task.edit') ✓): full gantt-task-react editable view
 * - Viewer (can('task.edit') ✗): read-only CSS-grid timeline with NO drag
 *   handles, per §5.2 hide-not-disable decision.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCan = vi.fn<[string], boolean>();

vi.mock('@/utils/access/useEffectiveRole', () => ({
  useEffectiveRole: () => ({
    can: mockCan,
    is: () => false,
    platformRole: 'member',
    platformRoleUpper: 'MEMBER',
    workspaceRole: 'workspace_member',
  }),
}));

// Mock the heavy gantt-task-react library to a probe element. We just need to
// detect WHICH renderer ran, not exercise the library's drag behavior.
vi.mock('gantt-task-react', () => ({
  Gantt: ({ tasks }: { tasks: Array<{ id: string; name: string }> }) => (
    <div data-testid="gantt-library-probe">
      {tasks.map((t) => (
        <span key={t.id}>{t.name}</span>
      ))}
    </div>
  ),
  ViewMode: { Month: 'Month' },
}));

import GanttChart from '../GanttChart';

const SAMPLE_TASKS = [
  {
    id: 't1',
    name: 'Design phase',
    startDate: '2026-05-01',
    endDate: '2026-05-15',
    status: 'in-progress',
    progress: 40,
  },
  {
    id: 't2',
    name: 'Build phase',
    startDate: '2026-05-16',
    endDate: '2026-06-15',
    status: 'todo',
    dependencies: ['t1'],
  },
];

describe('GanttChart — role-aware renderer dispatch (§3.6 + §5.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Admin / Member (can(task.edit) ✓)', () => {
    beforeEach(() => {
      mockCan.mockImplementation((token) => token === 'task.edit' || token === 'task.view');
    });

    it('renders the editable gantt-task-react Gantt component', () => {
      render(<GanttChart tasks={SAMPLE_TASKS} />);
      expect(screen.getByTestId('gantt-editable')).toBeTruthy();
      expect(screen.getByTestId('gantt-library-probe')).toBeTruthy();
      expect(screen.queryByTestId('gantt-readonly')).toBeNull();
    });

    it('does NOT render the Read-only badge', () => {
      render(<GanttChart tasks={SAMPLE_TASKS} />);
      expect(screen.queryByTestId('gantt-readonly-badge')).toBeNull();
    });
  });

  describe('Viewer (can(task.edit) ✗)', () => {
    beforeEach(() => {
      mockCan.mockImplementation((token) => token === 'task.view');
    });

    it('renders the ReadOnlyGanttView with badge — NOT the editable library', () => {
      render(<GanttChart tasks={SAMPLE_TASKS} />);
      expect(screen.getByTestId('gantt-readonly')).toBeTruthy();
      expect(screen.getByTestId('gantt-readonly-badge')).toBeTruthy();
      expect(screen.queryByTestId('gantt-editable')).toBeNull();
      expect(screen.queryByTestId('gantt-library-probe')).toBeNull();
    });

    it('renders a static positioned bar per task (§5.2: no drag handles)', () => {
      render(<GanttChart tasks={SAMPLE_TASKS} />);
      expect(screen.getByTestId('gantt-readonly-bar-t1')).toBeTruthy();
      expect(screen.getByTestId('gantt-readonly-bar-t2')).toBeTruthy();
    });

    it('renders a dependency indicator on tasks that have dependencies', () => {
      render(<GanttChart tasks={SAMPLE_TASKS} />);
      expect(screen.getByTestId('gantt-readonly-deps-t2')).toBeTruthy();
      expect(screen.queryByTestId('gantt-readonly-deps-t1')).toBeNull();
    });

    it('shows empty state when no tasks have dates', () => {
      render(<GanttChart tasks={[{ id: 'x', name: 'No-date task' }]} />);
      expect(screen.getByTestId('gantt-readonly-empty')).toBeTruthy();
    });
  });
});
