/**
 * Project Calendar Tab — Calendar MVP PR 1 + PR 2 (schedule API, multi-view, URL state).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { DatesSetArg, EventClickArg, EventInput } from '@fullcalendar/core';
import { Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspace.store';
import { getProjectSchedule, type ScheduleTask } from '@/features/work-management/schedule.api';

const URL_VIEWS = new Set(['month', 'week', 'day', 'agenda']);

type CalendarUrlView = 'month' | 'week' | 'day' | 'agenda';

/** PR 2 CONSTRAINT 14: local helper only (no app-wide responsive refactor). */
function useMediaQueryMatch(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

function normalizeUrlView(raw: string | null, isMobile: boolean): CalendarUrlView {
  if (raw && URL_VIEWS.has(raw)) return raw as CalendarUrlView;
  return isMobile ? 'agenda' : 'month';
}

function mapFcViewToUrl(fcView: string): CalendarUrlView {
  const map: Record<string, CalendarUrlView> = {
    dayGridMonth: 'month',
    timeGridWeek: 'week',
    timeGridDay: 'day',
    listWeek: 'agenda',
  };
  return map[fcView] ?? 'month';
}

function mapUrlViewToFc(urlView: CalendarUrlView): string {
  const map: Record<CalendarUrlView, string> = {
    month: 'dayGridMonth',
    week: 'timeGridWeek',
    day: 'timeGridDay',
    agenda: 'listWeek',
  };
  return map[urlView];
}

function taskStart(t: ScheduleTask): string | null {
  return t.plannedStartAt || t.startDate || t.actualStartAt;
}

function taskEnd(t: ScheduleTask): string | null {
  return t.plannedEndAt || t.dueDate || t.actualEndAt;
}

function scheduleTaskToEvent(t: ScheduleTask): EventInput | null {
  const start = taskStart(t);
  const end = taskEnd(t);

  if (t.isMilestone) {
    const anchor = start || end;
    if (!anchor) return null;
    const day = anchor.slice(0, 10);
    const { backgroundColor, borderColor } = statusStyle(t.status);
    return {
      id: t.id,
      title: `◆ ${t.title}`,
      start: day,
      allDay: true,
      backgroundColor,
      borderColor,
      extendedProps: { isMilestone: true, status: t.status },
    };
  }

  if (!start || !end) return null;

  const { backgroundColor, borderColor } = statusStyle(t.status);
  return {
    id: t.id,
    title: t.title,
    start,
    end,
    allDay: true,
    backgroundColor,
    borderColor,
    extendedProps: { isMilestone: false, status: t.status },
  };
}

function statusStyle(status: string): { backgroundColor: string; borderColor: string } {
  const s = status.toLowerCase().replace(/\s+/g, '_');
  if (s.includes('complete') || s === 'done') {
    return { backgroundColor: '#22c55e', borderColor: '#15803d' };
  }
  if (s.includes('progress') || s.includes('active')) {
    return { backgroundColor: '#3b82f6', borderColor: '#1d4ed8' };
  }
  if (s.includes('block')) {
    return { backgroundColor: '#ef4444', borderColor: '#b91c1c' };
  }
  return { backgroundColor: '#94a3b8', borderColor: '#475569' };
}

function ProjectCalendarTabInner() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeWorkspaceId } = useWorkspaceStore();
  const isMobile = useMediaQueryMatch('(max-width: 640px)');
  const calendarRef = useRef<ComponentRef<typeof FullCalendar>>(null);

  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveUrlView = useMemo(
    () => normalizeUrlView(searchParams.get('view'), isMobile),
    [searchParams, isMobile],
  );

  const initialFcView = mapUrlViewToFc(effectiveUrlView);

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getProjectSchedule(projectId, { mode: 'planned', includeCritical: false });
      setTasks(data.tasks || []);
    } catch (e: unknown) {
      console.error('Calendar: failed to load', e);
      setError(e instanceof Error ? e.message : 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const { events, undatedCount } = useMemo(() => {
    const ev: EventInput[] = [];
    let undated = 0;
    for (const t of tasks) {
      const mapped = scheduleTaskToEvent(t);
      if (mapped) ev.push(mapped);
      else undated += 1;
    }
    return { events: ev, undatedCount: undated };
  }, [tasks]);

  const onDatesSet = useCallback(
    (arg: DatesSetArg) => {
      const slug = mapFcViewToUrl(arg.view.type);
      setSearchParams(
        (prev) => {
          if (prev.get('view') === slug) return prev;
          const next = new URLSearchParams(prev);
          next.set('view', slug);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api || events.length === 0) return;
    const want = mapUrlViewToFc(effectiveUrlView);
    if (api.view.type !== want) {
      api.changeView(want);
    }
  }, [effectiveUrlView, events.length]);

  const onEventClick = useCallback(
    (info: EventClickArg) => {
      info.jsEvent.preventDefault();
      if (!projectId) return;
      navigate(`/projects/${projectId}/tasks?taskId=${encodeURIComponent(info.event.id)}`);
    },
    [navigate, projectId],
  );

  if (!projectId || !activeWorkspaceId) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <p>Select a workspace and project to view the calendar.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="calendar-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" data-testid="calendar-error">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 flex gap-2 dark:bg-red-950/40 dark:border-red-900 dark:text-red-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Error loading calendar</p>
            <p className="text-sm mt-1">{error}</p>
            <button type="button" onClick={() => void load()} className="mt-2 text-sm underline">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="calendar-root" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <CalendarIcon className="h-5 w-5 text-slate-700 dark:text-slate-300" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Calendar</h2>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {events.length} dated item{events.length !== 1 ? 's' : ''}
          {undatedCount > 0 ? ` · ${undatedCount} not on calendar (missing dates)` : ''}
        </span>
      </div>

      {tasks.length === 0 ? (
        <div
          className="rounded-lg border border-slate-200 bg-slate-50 p-10 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400"
          data-testid="calendar-empty-tasks"
        >
          <p className="font-medium text-slate-800 dark:text-slate-200">No tasks yet</p>
          <p className="mt-1 text-sm">Add work items with dates to see them on the calendar.</p>
        </div>
      ) : null}

      {tasks.length > 0 && events.length === 0 ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 p-10 text-center text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
          data-testid="calendar-empty-dates"
        >
          <p className="font-medium">No dated items to show</p>
          <p className="mt-1 text-sm">
            Tasks need schedule dates (planned or actual) to appear. Set dates from Activities or Gantt.
          </p>
        </div>
      ) : null}

      {events.length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView={initialFcView}
            events={events}
            eventClick={onEventClick}
            datesSet={onDatesSet}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
            }}
            height="auto"
            dayMaxEvents
            eventDisplay="block"
          />
        </div>
      ) : null}
    </div>
  );
}

export default function ProjectCalendarTab() {
  return <ProjectCalendarTabInner />;
}
