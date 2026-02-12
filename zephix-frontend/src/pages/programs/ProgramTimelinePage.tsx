/**
 * Sprint 8: Program Timeline Page
 *
 * Shows project bars and milestone markers across a program schedule.
 * Supports zoom (Day/Week/Month/Quarter), filters, and deep links.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useProgramRollup } from '@/features/programs/api';
import type { ProjectScheduleItem, Milestone, ProgramScheduleRollup } from '@/features/programs/types';
import { InlineLoadingState, EmptyStateCard } from '@/components/ui/states';
import { Gantt, Task as GanttTask, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import dayjs from 'dayjs';

// ─── Types ──────────────────────────────────────────────────────────────────

type ZoomLevel = 'Day' | 'Week' | 'Month' | 'Quarter';

const ZOOM_TO_VIEW_MODE: Record<ZoomLevel, ViewMode> = {
  Day: ViewMode.Day,
  Week: ViewMode.Week,
  Month: ViewMode.Month,
  Quarter: ViewMode.QuarterYear,
};

type ScheduleFilterStatus = 'all' | 'ON_TRACK' | 'AT_RISK' | 'DELAYED';
type HealthFilter = 'all' | 'green' | 'yellow' | 'red';
type PhaseFilter = 'all' | string;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getScheduleStatusBadge(status?: string | null) {
  switch (status) {
    case 'ON_TRACK':
      return <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-800">On Track</span>;
    case 'AT_RISK':
      return <span className="px-2 py-0.5 text-xs rounded bg-yellow-100 text-yellow-800">At Risk</span>;
    case 'DELAYED':
      return <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-800">Delayed</span>;
    default:
      return <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">Unknown</span>;
  }
}

function getConflictBadge(severity?: string | null) {
  if (!severity || severity === 'NONE') return null;
  const cls = severity === 'CRITICAL'
    ? 'bg-red-100 text-red-800'
    : 'bg-yellow-100 text-yellow-800';
  return <span className={`px-1.5 py-0.5 text-[10px] rounded ${cls}`}>{severity}</span>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ProgramTimelinePage() {
  const { workspaceId, programId } = useParams<{ workspaceId: string; programId: string }>();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const navigate = useNavigate();
  const wsId = workspaceId || activeWorkspaceId;

  const { data: rollup, isLoading, error } = useProgramRollup(wsId, programId);

  // Filters
  const [zoom, setZoom] = useState<ZoomLevel>('Month');
  const [statusFilter, setStatusFilter] = useState<ScheduleFilterStatus>('all');
  const [search, setSearch] = useState('');

  const schedule: ProgramScheduleRollup | null | undefined = rollup?.schedule;

  // ─── Filter projects ──────────────────────────────────────────────────

  const filteredItems: ProjectScheduleItem[] = useMemo(() => {
    if (!schedule) return [];
    let items = schedule.projectDateRangeItems;

    if (statusFilter !== 'all') {
      items = items.filter((p) => p.scheduleStatus === statusFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter((p) => p.projectName.toLowerCase().includes(q));
    }

    return items;
  }, [schedule, statusFilter, search]);

  // ─── Build Gantt data ─────────────────────────────────────────────────

  const { ganttTasks, milestoneList } = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 86400000);
    const tasks: GanttTask[] = [];
    const milestones: Milestone[] = schedule?.milestones || [];

    // Map of projectId -> milestone dates for milestone type in gantt
    const milestoneDatesByProject = new Map<string, Milestone[]>();
    for (const ms of milestones) {
      const arr = milestoneDatesByProject.get(ms.projectId) || [];
      arr.push(ms);
      milestoneDatesByProject.set(ms.projectId, arr);
    }

    // Create a project-level bar for each item
    for (const item of filteredItems) {
      const start = item.startDate ? new Date(item.startDate) : now;
      const end = item.endDate ? new Date(item.endDate) : weekFromNow;

      // Progress: simple heuristic based on where today falls in the range
      const totalMs = end.getTime() - start.getTime();
      const elapsedMs = now.getTime() - start.getTime();
      const progress = totalMs > 0
        ? Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)))
        : 0;

      tasks.push({
        id: item.projectId,
        name: item.projectName,
        start: start < end ? start : now,
        end: end > start ? end : weekFromNow,
        type: 'project',
        progress,
        isDisabled: false,
        styles: {
          backgroundColor: getProjectColor(item.scheduleStatus),
          progressColor: getProjectProgressColor(item.scheduleStatus),
        },
      });

      // Add milestones under the project
      const pMilestones = milestoneDatesByProject.get(item.projectId) || [];
      for (const ms of pMilestones) {
        if (!ms.date) continue;
        const msDate = new Date(ms.date);
        tasks.push({
          id: `ms-${ms.taskId}`,
          name: ms.title,
          start: msDate,
          end: msDate,
          type: 'milestone',
          progress: ms.status === 'DONE' ? 100 : 0,
          project: item.projectId,
          isDisabled: true,
        });
      }
    }

    return { ganttTasks: tasks, milestoneList: milestones };
  }, [filteredItems, schedule?.milestones]);

  // ─── Click handler ────────────────────────────────────────────────────

  const handleTaskClick = useCallback((task: GanttTask) => {
    // Only navigate for project bars, not milestones
    if (task.type === 'project') {
      navigate(`/projects/${task.id}`);
    }
  }, [navigate]);

  // ─── Render ───────────────────────────────────────────────────────────

  if (!wsId || !programId) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Workspace ID and Program ID required</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <InlineLoadingState text="Loading program timeline..." />
      </div>
    );
  }

  if (error || !rollup) {
    return (
      <div className="p-6">
        <EmptyStateCard
          title="Error loading program"
          description={error instanceof Error ? error.message : 'Program not found'}
        />
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <TimelineHeader
          rollup={rollup}
          wsId={wsId}
          programId={programId!}
        />
        <EmptyStateCard
          title="Schedule data not available"
          description="The schedule rollup is not yet computed for this program. Please ensure projects have tasks with dates."
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full mx-auto">
      <TimelineHeader rollup={rollup} wsId={wsId} programId={programId!} />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Zoom */}
        <div className="flex items-center gap-1 rounded-lg border p-0.5 bg-white">
          {(['Day', 'Week', 'Month', 'Quarter'] as ZoomLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => setZoom(level)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                zoom === level
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Schedule status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ScheduleFilterStatus)}
          className="px-3 py-1.5 text-sm border rounded-lg bg-white"
        >
          <option value="all">All statuses</option>
          <option value="ON_TRACK">On Track</option>
          <option value="AT_RISK">At Risk</option>
          <option value="DELAYED">Delayed</option>
        </select>

        {/* Search */}
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-lg bg-white w-48"
        />

        {/* Counts */}
        <div className="ml-auto flex items-center gap-4 text-xs text-gray-500">
          <span>{filteredItems.length} project(s)</span>
          {schedule.projectsAtRiskCount > 0 && (
            <span className="text-yellow-700">{schedule.projectsAtRiskCount} at risk</span>
          )}
          {schedule.projectsCriticalCount > 0 && (
            <span className="text-red-700">{schedule.projectsCriticalCount} critical</span>
          )}
        </div>
      </div>

      {/* Warnings */}
      {schedule.warnings.length > 0 && (
        <div className="mb-4 space-y-1">
          {schedule.warnings.slice(0, 5).map((w, i) => (
            <div key={i} className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 rounded px-3 py-1.5 text-amber-800">
              <span className="font-mono">[{w.code}]</span>
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Gantt chart */}
      {ganttTasks.length > 0 ? (
        <div className="border rounded-lg bg-white overflow-auto" style={{ minHeight: 300 }}>
          <Gantt
            tasks={ganttTasks}
            viewMode={ZOOM_TO_VIEW_MODE[zoom]}
            onClick={handleTaskClick}
            listCellWidth=""
            columnWidth={zoom === 'Day' ? 40 : zoom === 'Week' ? 60 : zoom === 'Month' ? 200 : 300}
            barFill={60}
          />
        </div>
      ) : (
        <EmptyStateCard
          title="No projects to display"
          description="No projects match the current filters, or no projects have scheduled dates."
        />
      )}

      {/* Project details table below the chart */}
      <div className="mt-6 border rounded-lg bg-white">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900">
            Project Schedule Details
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phase</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variance</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Conflicts</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredItems.map((item) => (
                <tr key={item.projectId} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <Link
                      to={`/projects/${item.projectId}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {item.projectName}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    {item.startDate ? dayjs(item.startDate).format('MMM D') : '—'}
                    {' → '}
                    {item.endDate ? dayjs(item.endDate).format('MMM D, YYYY') : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {item.phaseName || '—'}
                    {item.nextGateDate && (
                      <span className="ml-1 text-xs text-gray-400">
                        (gate: {dayjs(item.nextGateDate).format('MMM D')})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {getScheduleStatusBadge(item.scheduleStatus)}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {item.scheduleDeltaDays != null ? `+${item.scheduleDeltaDays}d` : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {getConflictBadge(item.resourceConflictSeverity) || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function TimelineHeader({ rollup, wsId, programId }: {
  rollup: { program: { name: string; status: string }; schedule?: { horizonStart: string; horizonEnd: string } | null };
  wsId: string;
  programId: string;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link to={`/workspaces/${wsId}/programs`} className="hover:text-gray-700">Programs</Link>
        <span>→</span>
        <Link to={`/workspaces/${wsId}/programs/${programId}`} className="hover:text-gray-700">
          {rollup.program.name}
        </Link>
        <span>→</span>
        <span>Timeline</span>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          {rollup.program.name} — Schedule Timeline
        </h1>
        {rollup.schedule && (
          <div className="text-xs text-gray-500">
            Horizon: {dayjs(rollup.schedule.horizonStart).format('MMM D')} → {dayjs(rollup.schedule.horizonEnd).format('MMM D, YYYY')}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Style helpers ──────────────────────────────────────────────────────────

function getProjectColor(status?: string | null): string {
  switch (status) {
    case 'DELAYED': return '#fecaca';
    case 'AT_RISK': return '#fef3c7';
    case 'ON_TRACK': return '#d1fae5';
    default: return '#e5e7eb';
  }
}

function getProjectProgressColor(status?: string | null): string {
  switch (status) {
    case 'DELAYED': return '#ef4444';
    case 'AT_RISK': return '#f59e0b';
    case 'ON_TRACK': return '#10b981';
    default: return '#9ca3af';
  }
}
