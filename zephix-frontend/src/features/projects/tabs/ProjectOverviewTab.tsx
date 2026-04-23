/**
 * ProjectOverviewTab — Command Center layout.
 *
 * Health Strip → Stat Cards + Team → To Do + Actions → Documents.
 * All stat counts computed from the same task list used for completion bar.
 */

import React, { useMemo, useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle,
  ClipboardList,
  Clock,
  UserX,
} from 'lucide-react';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { useProjectContext } from '../layout/ProjectPageLayout';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import { ProjectOverviewCards } from '../components/ProjectOverviewCards';
import type { ProjectOverview } from '../model/projectOverview';
import { listTasks, type WorkTask } from '@/features/work-management/workTasks.api';
import { CompletionBar } from '@/features/work-management/components/CompletionBar';
import { computeProjectCompletionPercent } from '@/features/work-management/statusWeights';

const WORK_TASK_LIST_PAGE_SIZE = 200;

const CLOSED_STATUSES = new Set(['DONE', 'COMPLETED', 'CANCELED', 'CANCELLED']);

function isOverdue(task: WorkTask): boolean {
  if (!task.dueDate) return false;
  if (CLOSED_STATUSES.has(task.status)) return false;
  return task.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10);
}

function isUnassigned(task: WorkTask): boolean {
  if (CLOSED_STATUSES.has(task.status)) return false;
  return !task.assigneeUserId;
}

const healthBadge: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  HEALTHY: { label: 'On Track', color: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30', dot: 'bg-green-500' },
  AT_RISK: { label: 'At Risk', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', dot: 'bg-amber-500' },
  BLOCKED: { label: 'Blocked', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30', dot: 'bg-red-500' },
};

export const ProjectOverviewTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    project,
    overviewSnapshot,
    overviewLoading,
    refreshOverviewSnapshot,
  } = useProjectContext();
  const effectiveWorkspaceId = project?.workspaceId ?? '';
  const { canWrite } = useWorkspaceRole(effectiveWorkspaceId || undefined);

  const overview: ProjectOverview | null = overviewSnapshot;

  const [rollupTasks, setRollupTasks] = useState<WorkTask[]>([]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await listTasks({ projectId, limit: WORK_TASK_LIST_PAGE_SIZE });
        if (!cancelled) setRollupTasks(Array.isArray(r.items) ? r.items : []);
      } catch {
        if (!cancelled) setRollupTasks([]);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  // ── Computed stats (from same task list as completion bar) ──────
  const projectCompletionPercent = useMemo(
    () => computeProjectCompletionPercent(rollupTasks),
    [rollupTasks],
  );

  const totalTasks = rollupTasks.length;
  const doneTasks = useMemo(() => rollupTasks.filter((t) => CLOSED_STATUSES.has(t.status)).length, [rollupTasks]);
  const overdueTasks = useMemo(() => rollupTasks.filter(isOverdue).length, [rollupTasks]);
  const unassignedTasks = useMemo(() => rollupTasks.filter(isUnassigned).length, [rollupTasks]);

  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId) {
      navigate(`/projects/${projectId}/tasks?taskId=${taskId}`, { replace: true });
    }
  }, [projectId, searchParams, navigate]);

  // ── Loading / Error states ─────────────────────────────────────
  if (overviewLoading && !overview) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!overviewLoading && !overview) {
    return (
      <EmptyState
        title="Unable to load overview"
        description="Project overview could not be loaded. Try again."
        icon={<AlertCircle className="h-12 w-12" />}
        action={
          <button
            type="button"
            onClick={() => void refreshOverviewSnapshot()}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            Try Again
          </button>
        }
      />
    );
  }

  if (!overview) return null;

  const health = healthBadge[overview.healthCode] || healthBadge.HEALTHY;

  return (
    <div className="space-y-5">
      {/* ── Health Strip ───────────────────────────────────────── */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center gap-4">
          {/* Completion */}
          <div className="flex items-center gap-3 min-w-[200px] flex-1">
            <CompletionBar percent={projectCompletionPercent} size="md" />
          </div>

          {/* Health badge */}
          <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${health.bg} ${health.color}`}>
            <span className={`h-2 w-2 rounded-full ${health.dot}`} />
            {health.label}
          </div>

          {/* Current phase */}
          {overview.projectState && (
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {overview.projectState}
            </span>
          )}

          {/* Methodology */}
          {project?.methodology && (
            <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 capitalize dark:bg-indigo-950/40 dark:text-indigo-300">
              {project.methodology}
            </span>
          )}
        </div>
      </div>

      {/* ── Stat Cards + Team ──────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Stat cards — 3 columns */}
        <StatCard
          icon={<ClipboardList className="h-5 w-5 text-indigo-500" />}
          value={totalTasks}
          label="Total Tasks"
          subtitle={`${doneTasks} completed, ${totalTasks - doneTasks} remaining`}
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-red-500" />}
          value={overdueTasks}
          label="Overdue"
          subtitle="tasks past due date"
          valueColor={overdueTasks > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}
        />
        <StatCard
          icon={<UserX className="h-5 w-5 text-amber-500" />}
          value={unassignedTasks}
          label="Unassigned"
          subtitle="tasks without an owner"
          valueColor={unassignedTasks > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}
        />

        {/* Behind target (from overview API) */}
        {overview.behindTargetDays !== null && overview.behindTargetDays > 0 && (
          <StatCard
            icon={<AlertCircle className="h-5 w-5 text-red-500" />}
            value={overview.behindTargetDays}
            label="Days Behind"
            subtitle="behind target date"
            valueColor="text-red-600 dark:text-red-400"
          />
        )}
      </div>

      {/* ── Existing cards (Team, To Do, Actions, Documents) ──── */}
      {project && effectiveWorkspaceId && (
        <ProjectOverviewCards
          project={project}
          workspaceId={effectiveWorkspaceId}
          overview={overview}
          canEdit={canWrite}
        />
      )}
    </div>
  );
};

/* ── Stat Card ──────────────────────────────────────────────────── */

function StatCard({
  icon,
  value,
  label,
  subtitle,
  valueColor = 'text-slate-900 dark:text-slate-100',
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  subtitle: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-700/50">{icon}</div>
      </div>
    </div>
  );
}

export default ProjectOverviewTab;
