/**
 * Project Gantt view. Renders one of two views depending on role
 * (taxonomy §3.6 + §5.2):
 *
 * - Admin / Member (`can('task.edit')` ✓): full gantt-task-react `<Gantt>` with
 *   drag-to-reschedule + progress drag + dependency rendering.
 * - Viewer (`can('task.edit')` ✗): `ReadOnlyGanttView` — a CSS-grid timeline
 *   with positioned bars, progress fill, and SVG dependency arrows. No drag
 *   handles render at all.
 *
 * Why two renderers (D4b decision): gantt-task-react has no `readOnly` prop.
 * Omitting `onDateChange` only neuters the callback; the visual drag handles
 * still render and the cursor still implies draggability. Per taxonomy §5.2
 * ("hide, not disable"), Viewer must not see drag affordances at all. A
 * second renderer is the cleanest conformance.
 *
 * @see docs/architecture/role-taxonomy-mvp.md §3.6 (Gantt affordances)
 * @see docs/architecture/role-taxonomy-mvp.md §5.2 (D&D hide-not-disable)
 */
import React, { useMemo } from 'react';
import { Gantt, Task as GanttTask, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";
import dayjs from 'dayjs';
import { Shield } from 'lucide-react';

import { useEffectiveRole } from '@/utils/access/useEffectiveRole';

interface GanttTaskInput {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  progress?: number;
  dependencies?: string[];
  resourceImpactScore?: number;
  status?: string;
}

interface GanttChartProps {
  tasks: GanttTaskInput[];
  onTaskUpdate?: (taskId: string, updates: any) => Promise<void>;
}

export default function GanttChart({ tasks, onTaskUpdate }: GanttChartProps) {
  const { can } = useEffectiveRole();
  const canEditTask = can('task.edit');

  if (!canEditTask) {
    return <ReadOnlyGanttView tasks={tasks} />;
  }

  return <EditableGanttView tasks={tasks} onTaskUpdate={onTaskUpdate} />;
}

/* -------------------------------------------------------------------------
 * Editable Gantt (Admin / Member) — existing gantt-task-react `<Gantt>`
 * ------------------------------------------------------------------------- */

function EditableGanttView({ tasks, onTaskUpdate }: GanttChartProps) {
  const ganttTasks: GanttTask[] = useMemo(() => {
    return tasks.map((task) => ({
      start: task.startDate ? new Date(task.startDate) : new Date(),
      end: task.endDate
        ? new Date(task.endDate)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      name: task.name,
      id: task.id,
      type: 'task' as const,
      progress: task.progress || 0,
      dependencies: task.dependencies || [],
      styles: {
        progressColor:
          task.status === 'completed'
            ? '#10b981'
            : task.status === 'in-progress'
              ? '#f59e0b'
              : '#6b7280',
        progressSelectedColor:
          task.status === 'completed'
            ? '#059669'
            : task.status === 'in-progress'
              ? '#d97706'
              : '#4b5563',
      },
    }));
  }, [tasks]);

  const handleTaskChange = async (task: GanttTask) => {
    if (onTaskUpdate) {
      await onTaskUpdate(task.id, {
        startDate: task.start.toISOString(),
        endDate: task.end.toISOString(),
        progress: task.progress,
      });
    }
  };

  return (
    <div className="w-full" data-testid="gantt-editable">
      <Gantt
        tasks={ganttTasks}
        viewMode={ViewMode.Month}
        onDateChange={handleTaskChange}
        onProgressChange={handleTaskChange}
        locale="en"
        barBackgroundColor="#3b82f6"
        barBackgroundSelectedColor="#1d4ed8"
        arrowColor="#6b7280"
        arrowIndent={20}
        todayColor="#ef4444"
        TooltipContent={({ task }) => (
          <div className="p-2 bg-white border rounded shadow-lg">
            <p className="font-medium">{task.name}</p>
            <p className="text-sm text-gray-600">
              {dayjs(task.start).format('MMM DD')} -{' '}
              {dayjs(task.end).format('MMM DD, YYYY')}
            </p>
            <p className="text-sm text-gray-600">Progress: {task.progress}%</p>
          </div>
        )}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Read-only Gantt (Viewer) — CSS grid timeline + SVG dependency arrows.
 * No drag handles. Bars are <div>s positioned by date offset.
 * ------------------------------------------------------------------------- */

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function ReadOnlyGanttView({ tasks }: { tasks: GanttTaskInput[] }) {
  const validTasks = useMemo(
    () => tasks.filter((t) => t.startDate && t.endDate),
    [tasks],
  );

  const range = useMemo(() => {
    if (validTasks.length === 0) return null;
    const starts = validTasks.map((t) => new Date(t.startDate!).getTime());
    const ends = validTasks.map((t) => new Date(t.endDate!).getTime());
    const min = Math.min(...starts);
    const max = Math.max(...ends);
    return {
      start: new Date(min),
      end: new Date(max),
      totalDays: Math.max(1, (max - min) / MS_PER_DAY + 1),
    };
  }, [validTasks]);

  const months = useMemo(() => {
    if (!range) return [];
    const out: { label: string; key: string }[] = [];
    let cur = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    const last = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
    while (cur <= last) {
      out.push({
        label: cur.toLocaleString('default', { month: 'short', year: '2-digit' }),
        key: `${cur.getFullYear()}-${cur.getMonth()}`,
      });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return out;
  }, [range]);

  if (!range || validTasks.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500" data-testid="gantt-readonly-empty">
        <p>No timeline data</p>
      </div>
    );
  }

  function barStyle(task: GanttTaskInput): React.CSSProperties {
    const start = new Date(task.startDate!).getTime();
    const end = new Date(task.endDate!).getTime();
    const offsetDays = (start - range!.start.getTime()) / MS_PER_DAY;
    const durationDays = Math.max(1, (end - start) / MS_PER_DAY + 1);
    return {
      left: `${(offsetDays / range!.totalDays) * 100}%`,
      width: `${(durationDays / range!.totalDays) * 100}%`,
    };
  }

  function barColor(status?: string): string {
    if (status === 'completed') return 'bg-green-500';
    if (status === 'in-progress') return 'bg-amber-500';
    return 'bg-slate-400';
  }

  // Dependency arrow positions: from end of source bar → start of target bar.
  // Pixel positions are approximate (row-height-based).
  const taskIndex = new Map(validTasks.map((t, i) => [t.id, i]));
  const ROW_HEIGHT = 32; // matches py-1.5 + h-6 bar container

  return (
    <div className="w-full" data-testid="gantt-readonly">
      <div
        className="mb-3 inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded"
        data-testid="gantt-readonly-badge"
      >
        <Shield className="h-3 w-3" /> Read-only timeline
      </div>

      {/* Header row */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        <div className="w-48 flex-shrink-0 text-xs font-semibold text-slate-500 py-2 px-2">
          Task
        </div>
        <div className="relative flex-1">
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${months.length}, 1fr)` }}
          >
            {months.map((m) => (
              <div
                key={m.key}
                className="text-xs text-slate-500 py-2 px-1 border-l border-slate-200 text-center"
              >
                {m.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task rows */}
      <div className="relative">
        {validTasks.map((task, rowIdx) => (
          <div
            key={task.id}
            className="flex items-center border-b border-slate-100 py-1.5"
            data-testid={`gantt-readonly-row-${task.id}`}
          >
            <div
              className="w-48 flex-shrink-0 text-xs text-slate-700 px-2 truncate"
              title={task.name}
            >
              {task.name}
              {task.dependencies && task.dependencies.length > 0 && (
                <span
                  className="ml-1 text-slate-400"
                  title={`Depends on ${task.dependencies.length}`}
                  data-testid={`gantt-readonly-deps-${task.id}`}
                >
                  ↳
                </span>
              )}
            </div>
            <div className="relative flex-1 h-6">
              <div
                className={`absolute top-1 h-4 rounded ${barColor(task.status)}`}
                style={barStyle(task)}
                title={`${task.name}: ${task.startDate?.slice(0, 10) ?? ''} → ${task.endDate?.slice(0, 10) ?? ''}${task.progress != null ? ` (${task.progress}%)` : ''}`}
                data-testid={`gantt-readonly-bar-${task.id}`}
              >
                {task.progress != null && task.progress > 0 && (
                  <div
                    className="absolute top-0 left-0 h-full bg-white/30 rounded-l"
                    style={{ width: `${Math.min(100, task.progress)}%` }}
                  />
                )}
              </div>
            </div>
            <span className="sr-only">Row {rowIdx + 1}</span>
          </div>
        ))}

        {/* SVG dependency overlay — straight dashed lines between bar endpoints */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ left: '12rem', right: 0, top: 0 }}
          aria-hidden="true"
        >
          {validTasks.flatMap((task) =>
            (task.dependencies ?? [])
              .map((depId) => {
                const fromIdx = taskIndex.get(depId);
                const toIdx = taskIndex.get(task.id);
                if (fromIdx == null || toIdx == null) return null;
                const fromTask = validTasks[fromIdx];
                if (!fromTask.endDate || !task.startDate) return null;
                const fromX =
                  ((new Date(fromTask.endDate).getTime() - range.start.getTime()) /
                    MS_PER_DAY /
                    range.totalDays) *
                  100;
                const toX =
                  ((new Date(task.startDate).getTime() - range.start.getTime()) /
                    MS_PER_DAY /
                    range.totalDays) *
                  100;
                const fromY = fromIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
                const toY = toIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
                return (
                  <line
                    key={`${depId}->${task.id}`}
                    x1={`${fromX}%`}
                    y1={fromY}
                    x2={`${toX}%`}
                    y2={toY}
                    stroke="#94a3b8"
                    strokeWidth="1"
                    strokeDasharray="3,2"
                  />
                );
              })
              .filter(Boolean),
          )}
        </svg>
      </div>
    </div>
  );
}
