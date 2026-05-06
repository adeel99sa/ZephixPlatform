import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import React from 'react';
import type { ScheduleTask } from '@/features/work-management/schedule.api';
import ProjectCalendarTab from '../ProjectCalendarTab';

function LocationEcho() {
  const { pathname, search } = useLocation();
  return (
    <div data-testid="location-echo">
      {pathname}
      {search}
    </div>
  );
}

vi.mock('@fullcalendar/react', () => ({
  default: React.forwardRef(function MockFullCalendar(props: any, ref: React.Ref<{ getApi: () => any }>) {
    const [view, setView] = React.useState(props.initialView);
    React.useEffect(() => {
      setView(props.initialView);
    }, [props.initialView]);
    React.useEffect(() => {
      props.datesSet?.({ view: { type: view } });
    }, [view, props.datesSet]);
    React.useImperativeHandle(ref, () => ({
      getApi: () => ({
        get view() {
          return { type: view };
        },
        changeView: (next: string) => {
          setView(next);
        },
      }),
    }));
    return (
      <div>
        <div data-testid="fullcalendar-mock" data-initial-view={view}>
          {(props.events || []).map((e: any) => (
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
        <button
          type="button"
          data-testid="sim-dates-week"
          onClick={() => props.datesSet?.({ view: { type: 'timeGridWeek' } })}
        >
          sim-week
        </button>
      </div>
    );
  }),
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

function mockMatchMedia(matches: boolean) {
  const mm = vi.fn().mockImplementation(() => ({
    matches,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  Object.defineProperty(window, 'matchMedia', { writable: true, configurable: true, value: mm });
  return mm;
}

const origMatchMedia = window.matchMedia;

function renderWithRoutes(initialPath = '/projects/proj-1/calendar') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LocationEcho />
      <Routes>
        <Route path="/projects/:projectId/calendar" element={<ProjectCalendarTab />} />
        <Route path="/projects/:projectId/tasks" element={<div data-testid="activities-page">Activities</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function mockScheduleWithDatedTask() {
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
}

describe('ProjectCalendarTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false);
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', { writable: true, configurable: true, value: origMatchMedia });
  });

  it('loads schedule and renders mocked FullCalendar when tasks have date range', async () => {
    mockScheduleWithDatedTask();
    renderWithRoutes();

    await waitFor(() => {
      expect(screen.getByTestId('calendar-root')).toBeInTheDocument();
    });
    expect(screen.getByTestId('fullcalendar-mock')).toBeInTheDocument();
    expect(screen.getByTestId('cal-ev-t1')).toHaveTextContent('Alpha Task');
  });

  it('defaults to month view on desktop (no view param)', async () => {
    mockScheduleWithDatedTask();
    renderWithRoutes('/projects/proj-1/calendar');

    await waitFor(() => expect(screen.getByTestId('fullcalendar-mock')).toHaveAttribute('data-initial-view', 'dayGridMonth'));
    await waitFor(() => {
      expect(screen.getByTestId('location-echo').textContent).toContain('view=month');
    });
  });

  it('defaults to agenda (listWeek) on mobile when view param is absent', async () => {
    mockMatchMedia(true);
    mockScheduleWithDatedTask();
    renderWithRoutes('/projects/proj-1/calendar');

    await waitFor(() =>
      expect(screen.getByTestId('fullcalendar-mock')).toHaveAttribute('data-initial-view', 'listWeek'),
    );
  });

  it('initializes week view from ?view=week', async () => {
    mockScheduleWithDatedTask();
    renderWithRoutes('/projects/proj-1/calendar?view=week');

    await waitFor(() =>
      expect(screen.getByTestId('fullcalendar-mock')).toHaveAttribute('data-initial-view', 'timeGridWeek'),
    );
  });

  it('initializes day view from ?view=day', async () => {
    mockScheduleWithDatedTask();
    renderWithRoutes('/projects/proj-1/calendar?view=day');

    await waitFor(() =>
      expect(screen.getByTestId('fullcalendar-mock')).toHaveAttribute('data-initial-view', 'timeGridDay'),
    );
  });

  it('initializes agenda from ?view=agenda', async () => {
    mockScheduleWithDatedTask();
    renderWithRoutes('/projects/proj-1/calendar?view=agenda');

    await waitFor(() =>
      expect(screen.getByTestId('fullcalendar-mock')).toHaveAttribute('data-initial-view', 'listWeek'),
    );
  });

  it('falls back to month on desktop when view param is invalid', async () => {
    mockScheduleWithDatedTask();
    renderWithRoutes('/projects/proj-1/calendar?view=not-a-view');

    await waitFor(() =>
      expect(screen.getByTestId('fullcalendar-mock')).toHaveAttribute('data-initial-view', 'dayGridMonth'),
    );
  });

  it('updates URL when calendar reports a view change (datesSet)', async () => {
    mockScheduleWithDatedTask();
    const user = userEvent.setup();
    renderWithRoutes('/projects/proj-1/calendar');

    await waitFor(() => expect(screen.getByTestId('sim-dates-week')).toBeInTheDocument());
    await user.click(screen.getByTestId('sim-dates-week'));

    await waitFor(() => {
      expect(screen.getByTestId('location-echo').textContent).toContain('view=week');
    });
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

    await waitFor(() => {
      expect(screen.getByTestId('activities-page')).toBeInTheDocument();
      expect(screen.getByTestId('location-echo').textContent).toContain('/projects/proj-1/tasks');
      expect(screen.getByTestId('location-echo').textContent).toContain('taskId=t-click');
    });
  });
});
