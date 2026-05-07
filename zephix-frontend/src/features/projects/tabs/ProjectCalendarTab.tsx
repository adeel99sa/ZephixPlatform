/**
 * Project Calendar Tab — Calendar MVP PR 1–3 (schedule API, multi-view, URL state, drag, filters).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { DatesSetArg, EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import { Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/hooks/useAuth';
import { isPlatformViewer } from '@/utils/access';
import {
  getProjectSchedule,
  patchTaskSchedule,
  type ScheduleTask,
} from '@/features/work-management/schedule.api';
import type { WorkTaskStatus } from '@/features/work-management/workTasks.api';
import {
  FilterBar,
  filtersFromParams,
  type FilterBarDimension,
  type FilterBarOptions,
  type TaskFilters,
} from '@/features/projects/components/FilterBar';
import { listWorkspaceMembers, type WorkspaceMemberRow } from '@/features/workspaces/members/api';
import { apiClient } from '@/lib/api/client';

const URL_VIEWS = new Set(['month', 'week', 'day', 'agenda']);

type CalendarUrlView = 'month' | 'week' | 'day' | 'agenda';

/** Calendar FilterBar: only filters that schedule rows + matcher support (PR P0). */
const CALENDAR_FILTER_DIMENSIONS: FilterBarDimension[] = ['status', 'assigneeUserId', 'phaseId'];

export type CalendarPhaseMeta = { id: string; name: string; colorToken: string | null };
type ProjectPlanResponse = {
  phases?: Array<{ id: string; name: string; colorToken?: string | null }>;
};

/** Maps persisted palette tokens (Tailwind names) to hex fills — white labels for WCAG AA on bars. */
export const PHASE_TOKEN_HEX: Record<string, { backgroundColor: string; borderColor: string }> = {
  indigo: { backgroundColor: '#4f46e5', borderColor: '#4338ca' },
  blue: { backgroundColor: '#2563eb', borderColor: '#1d4ed8' },
  emerald: { backgroundColor: '#059669', borderColor: '#047857' },
  amber: { backgroundColor: '#d97706', borderColor: '#b45309' },
  slate: { backgroundColor: '#475569', borderColor: '#334155' },
};

const EVENT_TEXT_ON_BAR = '#ffffff';

/** Mirror ProjectTableTab FilterBar option lists (calendar applies status/phase/assignee client-side). */
const STATUS_OPTIONS: WorkTaskStatus[] = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'BLOCKED',
  'IN_REVIEW',
  'DONE',
  'CANCELED',
];
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

/** Client-side filters for schedule rows (assignee + phase + status); mirrors Gantt subset + assignee PR3. */
function calendarScheduleTaskMatchesFilters(t: ScheduleTask, f: TaskFilters): boolean {
  if (f.status?.length && !f.status.includes(t.status)) return false;
  if (f.phaseId?.length) {
    const pid = t.phaseId ?? '';
    if (!pid || !f.phaseId.includes(pid)) return false;
  }
  if (f.assigneeUserId?.length) {
    const aid = t.assigneeUserId ?? '';
    if (!aid || !f.assigneeUserId.includes(aid)) return false;
  }
  return true;
}

export function barColorsForScheduleTask(
  t: ScheduleTask,
  colorBy: 'phase' | 'status',
  phaseById: Map<string, { colorToken: string | null }>,
): { backgroundColor: string; borderColor: string; textColor: string } {
  if (colorBy === 'status') {
    const s = statusStyle(t.status);
    return { ...s, textColor: EVENT_TEXT_ON_BAR };
  }
  if (!t.phaseId) {
    const s = statusStyle(t.status);
    return { ...s, textColor: EVENT_TEXT_ON_BAR };
  }
  const raw = phaseById.get(t.phaseId)?.colorToken?.trim().toLowerCase() ?? null;
  if (raw && PHASE_TOKEN_HEX[raw]) {
    return { ...PHASE_TOKEN_HEX[raw], textColor: EVENT_TEXT_ON_BAR };
  }
  if (raw) {
    return { ...PHASE_TOKEN_HEX.blue, textColor: EVENT_TEXT_ON_BAR };
  }
  const s = statusStyle(t.status);
  return { ...s, textColor: EVENT_TEXT_ON_BAR };
}

function scheduleTaskToEvent(
  t: ScheduleTask,
  colorBy: 'phase' | 'status',
  phaseById: Map<string, { colorToken: string | null }>,
): EventInput | null {
  const start = taskStart(t);
  const end = taskEnd(t);

  if (t.isMilestone) {
    const anchor = start || end;
    if (!anchor) return null;
    const day = anchor.slice(0, 10);
    const { backgroundColor, borderColor, textColor } = barColorsForScheduleTask(t, colorBy, phaseById);
    return {
      id: t.id,
      title: `◆ ${t.title}`,
      start: day,
      allDay: true,
      backgroundColor,
      borderColor,
      textColor,
      startEditable: false,
      durationEditable: false,
      extendedProps: {
        isMilestone: true,
        status: t.status,
        phaseId: t.phaseId,
        colorBy,
      },
    };
  }

  if (!start || !end) return null;

  const { backgroundColor, borderColor, textColor } = barColorsForScheduleTask(t, colorBy, phaseById);
  return {
    id: t.id,
    title: t.title,
    start,
    end,
    allDay: true,
    backgroundColor,
    borderColor,
    textColor,
    startEditable: true,
    durationEditable: true,
    extendedProps: {
      isMilestone: false,
      status: t.status,
      phaseId: t.phaseId,
      colorBy,
    },
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
  const { user } = useAuth();
  const isGuest = isPlatformViewer(user);
  const isMobile = useMediaQueryMatch('(max-width: 640px)');
  const calendarRef = useRef<ComponentRef<typeof FullCalendar>>(null);

  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [members, setMembers] = useState<WorkspaceMemberRow[]>([]);
  const [phases, setPhases] = useState<CalendarPhaseMeta[]>([]);

  const effectiveUrlView = useMemo(
    () => normalizeUrlView(searchParams.get('view'), isMobile),
    [searchParams, isMobile],
  );

  const initialFcView = mapUrlViewToFc(effectiveUrlView);

  const urlFilters = useMemo(() => filtersFromParams(searchParams), [searchParams]);

  const colorBy = useMemo(
    () => (searchParams.get('colorBy') === 'status' ? 'status' : 'phase'),
    [searchParams],
  );

  const setColorBy = useCallback(
    (next: 'phase' | 'status') => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === 'phase') {
            p.delete('colorBy');
          } else {
            p.set('colorBy', 'status');
          }
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const phaseById = useMemo(() => {
    const m = new Map<string, { colorToken: string | null }>();
    for (const ph of phases) {
      m.set(ph.id, { colorToken: ph.colorToken });
    }
    return m;
  }, [phases]);

  const filterBarOptions: FilterBarOptions = useMemo(
    () => ({
      members,
      phases,
      statuses: STATUS_OPTIONS as unknown as string[],
      priorities: [],
      types: [],
    }),
    [members, phases],
  );

  const filteredTasks = useMemo(
    () => tasks.filter((t) => calendarScheduleTaskMatchesFilters(t, urlFilters)),
    [tasks, urlFilters],
  );

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

  useEffect(() => {
    if (!activeWorkspaceId) return;
    listWorkspaceMembers(activeWorkspaceId).then(setMembers).catch(() => {});
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!projectId || !activeWorkspaceId) return;
    const loadProjectPlan = async () => {
      try {
        const plan = await apiClient.get<ProjectPlanResponse>(`/work/projects/${projectId}/plan`, {
          headers: { 'x-workspace-id': activeWorkspaceId },
        });
        setPhases(
          (plan?.phases ?? []).map((p: NonNullable<ProjectPlanResponse['phases']>[number]) => ({
            id: p.id,
            name: p.name,
            colorToken: p.colorToken ?? null,
          })),
        );
      } catch (e: unknown) {
        console.error('Calendar: failed to load project plan', e);
        setError(e instanceof Error ? e.message : 'Failed to load project plan');
      }
    };
    void loadProjectPlan();
  }, [projectId, activeWorkspaceId]);

  const { events, undatedCount } = useMemo(() => {
    const ev: EventInput[] = [];
    let undated = 0;
    for (const t of filteredTasks) {
      const mapped = scheduleTaskToEvent(t, colorBy, phaseById);
      if (mapped) ev.push(mapped);
      else undated += 1;
    }
    return { events: ev, undatedCount: undated };
  }, [filteredTasks, colorBy, phaseById]);

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

  const persistScheduleDrag = useCallback(
    async (info: { event: EventDropArg['event']; revert: () => void }) => {
      if (isGuest || !projectId) {
        info.revert();
        return;
      }
      const taskId = info.event.id;
      const start = info.event.start;
      const end = info.event.end ?? info.event.start;
      if (!start || !end) {
        info.revert();
        return;
      }
      try {
        const result = await patchTaskSchedule(projectId, taskId, {
          plannedStartAt: start.toISOString(),
          plannedEndAt: end.toISOString(),
          cascade: 'forward',
        });
        if (result.violations.length > 0) {
          setToast(`Warning: ${result.violations.join(', ')}`);
          setTimeout(() => setToast(null), 5000);
        }
        if (result.cascadedTaskIds.length > 0) {
          setToast(`Moved task and cascaded to ${result.cascadedTaskIds.length} successor(s)`);
          setTimeout(() => setToast(null), 3000);
        }
        await load();
      } catch (err: unknown) {
        info.revert();
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
        setToast(msg || 'Failed to update schedule');
        setTimeout(() => setToast(null), 5000);
      }
    },
    [projectId, isGuest, load],
  );

  const onEventDrop = useCallback(
    async (info: EventDropArg) => {
      await persistScheduleDrag(info);
    },
    [persistScheduleDrag],
  );

  const onEventResize = useCallback(
    async (info: EventResizeDoneArg) => {
      await persistScheduleDrag(info);
    },
    [persistScheduleDrag],
  );

  const onEventClick = useCallback(
    (info: EventClickArg) => {
      info.jsEvent.preventDefault();
      if (!projectId) return;
      navigate(`/projects/${projectId}/tasks?taskId=${encodeURIComponent(info.event.id)}`);
    },
    [navigate, projectId],
  );

  const filterExcludedTotal = tasks.length - filteredTasks.length;

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
      {toast ? (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
          {toast}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <CalendarIcon className="h-5 w-5 text-slate-700 dark:text-slate-300 shrink-0" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Calendar</h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {events.length} dated item{events.length !== 1 ? 's' : ''}
            {undatedCount > 0 ? ` · ${undatedCount} not on calendar (missing dates)` : ''}
            {filterExcludedTotal > 0 ? ` · ${filterExcludedTotal} hidden by filters` : ''}
          </span>
        </div>
        <div
          className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"
          data-testid="calendar-color-by"
        >
          <span className="hidden sm:inline whitespace-nowrap">Color by</span>
          <button
            type="button"
            data-testid="calendar-color-phase"
            onClick={() => setColorBy('phase')}
            className={`rounded px-2 py-0.5 transition-colors ${
              colorBy === 'phase'
                ? 'bg-indigo-100 font-semibold text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Phase
          </button>
          <button
            type="button"
            data-testid="calendar-color-status"
            onClick={() => setColorBy('status')}
            className={`rounded px-2 py-0.5 transition-colors ${
              colorBy === 'status'
                ? 'bg-indigo-100 font-semibold text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Status
          </button>
        </div>
      </div>

      {tasks.length > 0 ? (
        <FilterBar
          options={filterBarOptions}
          visibleDimensions={CALENDAR_FILTER_DIMENSIONS}
          className="mb-1"
        />
      ) : null}

      {tasks.length === 0 ? (
        <div
          className="rounded-lg border border-slate-200 bg-slate-50 p-10 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400"
          data-testid="calendar-empty-tasks"
        >
          <p className="font-medium text-slate-800 dark:text-slate-200">No tasks yet</p>
          <p className="mt-1 text-sm">Add work items with dates to see them on the calendar.</p>
        </div>
      ) : null}

      {tasks.length > 0 && filteredTasks.length === 0 ? (
        <div
          className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400"
          data-testid="calendar-filter-empty"
        >
          <p className="font-medium">No tasks match the current filters</p>
          <p className="mt-1 text-sm">Adjust filters or clear them to see items.</p>
        </div>
      ) : null}

      {tasks.length > 0 && events.length === 0 && filteredTasks.length > 0 ? (
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
            editable={!isGuest}
            eventClick={onEventClick}
            eventDrop={isGuest ? undefined : onEventDrop}
            eventResize={isGuest ? undefined : onEventResize}
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
