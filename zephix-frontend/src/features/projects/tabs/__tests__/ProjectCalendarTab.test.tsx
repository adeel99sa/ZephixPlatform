import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type { ScheduleTask } from '@/features/work-management/schedule.api';

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

import ProjectCalendarTab from '../ProjectCalendarTab';

vi.mock('@fullcalendar/react', () => ({
  default: function MockFullCalendar(props: {
    events?: Array<{ id: string; title: string }>;
    eventClick?: (info: {
      event: { id: string };
      jsEvent: { preventDefault: () => void };
    }) => void;
  }) {
    return (
      <div data-testid="fullcalendar-mock">
        {(props.events || []).map((e) => (
          <button
            key={e.id}
            type="button"
            data-testid={`cal-ev-${e.id}`}
            onClick={() =>
              props.eventClick?.({
                event: { id: e.id },
                jsEvent: { preventDefault: () => {} },
              })
            }
          >
            {e.title}
          </button>
        ))}
      </div>
    );
  },
}));

vi.mock('@/features/work-management/schedule.api', () => ({
  getProjectSchedule: vi.fn(),
}));

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: () => ({ activeWorkspaceId: 'ws-1' }),
}));

import { getProjectSchedule } from '@/features/work-management/schedule.api';

const baseTask = (overrides: Partial<ScheduleTask>): ScheduleTask => ({
  id: 't1',
  title: 'Task One',
  phaseId: null,
  status: 'in_progress',
  startDate: null,
  dueDate: null,
  plannedStartAt: null,
  plannedEndAt: null,
  actualStartAt: null,
  actualEndAt: null,
  percentComplete: 0,
  isMilestone: false,
  constraintType: 'ASAP',
  wbsCode: null,
  isCritical: false,
  totalFloatMinutes: null,
  ...overrides,
});

function renderWithRoutes(initialPath = '/projects/proj-1/calendar') {
  const router = createMemoryRouter(
    [
      { path: '/projects/:projectId/calendar', element: <ProjectCalendarTab /> },
      { path: '/projects/:projectId/tasks', element: <div data-testid="activities-page">Activities</div> },
    ],
    { initialEntries: [initialPath] },
  );
  return { router, ...render(<RouterProvider router={router} />) };
}

describe('ProjectCalendarTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockReset();
  });

  it('loads schedule and renders mocked FullCalendar when tasks have date range', async () => {
    (getProjectSchedule as ReturnType<typeof vi.fn>).mockResolvedValue({
      tasks: [
        baseTask({
          id: 't1',
          title: 'Alpha Task',
          startDate: '2026-05-01',
          dueDate: '2026-05-10',
        }),
      ],
      dependencies: [],
      criticalPathTaskIds: [],
      projectFinishMinutes: null,
    });

    renderWithRoutes();

    await waitFor(() => {
      expect(screen.getByTestId('calendar-root')).toBeInTheDocument();
    });
    expect(screen.getByTestId('fullcalendar-mock')).toBeInTheDocument();
    expect(screen.getByTestId('cal-ev-t1')).toHaveTextContent('Alpha Task');
  });

  it('shows empty state when project has no tasks', async () => {
    (getProjectSchedule as ReturnType<typeof vi.fn>).mockResolvedValue({
      tasks: [],
      dependencies: [],
      criticalPathTaskIds: [],
      projectFinishMinutes: null,
    });

    renderWithRoutes();

    await waitFor(() => {
      expect(screen.getByTestId('calendar-empty-tasks')).toBeInTheDocument();
    });
  });

  it('shows undated message when no events mappable', async () => {
    (getProjectSchedule as ReturnType<typeof vi.fn>).mockResolvedValue({
      tasks: [baseTask({ id: 'u1', title: 'No dates', startDate: null, dueDate: null })],
      dependencies: [],
      criticalPathTaskIds: [],
      projectFinishMinutes: null,
    });

    renderWithRoutes();

    await waitFor(() => {
      expect(screen.getByTestId('calendar-empty-dates')).toBeInTheDocument();
    });
  });

  it('navigates to Activities with taskId on event click', async () => {
    (getProjectSchedule as ReturnType<typeof vi.fn>).mockResolvedValue({
      tasks: [
        baseTask({
          id: 't-click',
          title: 'Click Me',
          startDate: '2026-05-01',
          dueDate: '2026-05-05',
        }),
      ],
      dependencies: [],
      criticalPathTaskIds: [],
      projectFinishMinutes: null,
    });

    const user = userEvent.setup();
    renderWithRoutes();

    await waitFor(() => expect(screen.getByTestId('cal-ev-t-click')).toBeInTheDocument());
    await user.click(screen.getByTestId('cal-ev-t-click'));

    expect(navigateMock).toHaveBeenCalledWith('/projects/proj-1/tasks?taskId=t-click');
  });
});
