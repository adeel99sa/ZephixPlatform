import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import type { TaskDetailDto, TaskLifecycle } from '../../api/taskDetail.api';
import { calculateScheduleInfo, SCHEDULE_STATUS_CONFIG, type ScheduleStatus } from '../../utils/schedule-variance';
import { AcceptanceCriteriaEditor } from '../AcceptanceCriteriaEditor';
import { ExplanationBanner, type ExplanationResult } from '@/features/explanations';
import { intentColors } from '@/design/tokens';
import { typography } from '@/design/typography';

const LIFECYCLE_BADGE: Record<string, { bg: string; label: string }> = {
  PLANNED: { bg: intentColors.neutral.badge, label: 'Planned' },
  IN_PROGRESS: { bg: intentColors.info.badge, label: 'In Progress' },
  BLOCKED: { bg: intentColors.danger.badge, label: 'Blocked' },
  COMPLETED: { bg: intentColors.success.badge, label: 'Completed' },
  CANCELLED: { bg: intentColors.neutral.badge, label: 'Cancelled' },
};

function detectLifecycleMismatch(status: string, lifecycle: TaskLifecycle | undefined): string | null {
  if (!lifecycle) return null;
  if (status === 'IN_PROGRESS' && lifecycle === 'BLOCKED') {
    return 'Task status is In Progress but it is blocked by dependencies or a blocker reason.';
  }
  if (status === 'DONE' && lifecycle !== 'COMPLETED' && lifecycle !== 'CANCELLED') {
    return 'Task is marked Done but missing an actual end date — lifecycle not completed.';
  }
  return null;
}

function formatDate(d?: string | null): string {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface Props {
  detail: TaskDetailDto;
  explanations: ExplanationResult;
  canEditWork: boolean;
  onSaveAC: (items: Array<{ text: string; done: boolean }>) => Promise<void>;
  onToggleSubtask: (subtaskId: string, currentStatus: string) => void;
  onCreateSubtask: () => void;
  newSubtaskTitle: string;
  onNewSubtaskTitleChange: (value: string) => void;
  creatingSubtask: boolean;
  onClose: () => void;
}

export function WorkItemOverviewTab({
  detail, explanations, canEditWork,
  onSaveAC, onToggleSubtask, onCreateSubtask, newSubtaskTitle, onNewSubtaskTitleChange, creatingSubtask,
  onClose,
}: Props) {
  const { task } = detail;
  const depsCount = detail.dependencies.blockedBy.length + detail.dependencies.blocking.length;

  // Schedule section
  const sched = detail.schedule
    ? {
        plannedDurationDays: detail.schedule.plannedDurationDays,
        actualDurationDays: detail.schedule.actualDurationDays,
        startVarianceDays: detail.schedule.startVarianceDays,
        endVarianceDays: detail.schedule.endVarianceDays,
        forecastEndDate: detail.schedule.forecastEndDate,
        status: detail.schedule.status as ScheduleStatus,
      }
    : calculateScheduleInfo({
        startDate: task.startDate ?? null,
        dueDate: task.dueDate ?? null,
        actualStartDate: task.actualStartDate ?? null,
        actualEndDate: task.actualEndDate ?? null,
      });
  const schedCfg = SCHEDULE_STATUS_CONFIG[sched.status] ?? SCHEDULE_STATUS_CONFIG.AT_RISK;
  const hasScheduleData = sched.plannedDurationDays != null || sched.actualDurationDays != null;

  return (
    <div className="p-4 space-y-5">
      {/* Lifecycle badge */}
      {detail.lifecycle && (
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs">Lifecycle</span>
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${LIFECYCLE_BADGE[detail.lifecycle]?.bg || 'bg-gray-100 text-gray-700'}`} data-testid="lifecycle-badge">
            {LIFECYCLE_BADGE[detail.lifecycle]?.label || detail.lifecycle}
          </span>
          {detail.lifecycle === 'BLOCKED' && (
            <span className="text-xs text-red-600">
              {detail.isBlockedByDependencies ? `${detail.blockingTaskCount} blocking dep${detail.blockingTaskCount !== 1 ? 's' : ''}` : ''}
              {detail.isBlockedByDependencies && task.blockedReason ? ' \u00b7 ' : ''}
              {task.blockedReason || ''}
            </span>
          )}
        </div>
      )}

      {/* Lifecycle mismatch warning */}
      {(() => {
        const mismatch = detectLifecycleMismatch(task.status, detail.lifecycle);
        if (!mismatch) return null;
        return (
          <div className={`flex items-start gap-2 rounded-lg border ${intentColors.warning.border} ${intentColors.warning.bg} p-3`} data-testid="lifecycle-mismatch-warning">
            <AlertTriangle className={`h-4 w-4 ${intentColors.warning.text} mt-0.5 shrink-0`} />
            <p className="text-xs text-amber-800">{mismatch}</p>
          </div>
        );
      })()}

      <ExplanationBanner explanations={explanations} className="mb-4" />

      {/* Meta fields — primary */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className={typography.muted + ' block'}>Type</span><span className="font-medium text-slate-900">{task.type || 'TASK'}</span></div>
        <div><span className={typography.muted + ' block'}>Due</span><span className="font-medium text-slate-900">{formatDate(task.dueDate)}</span></div>
        <div><span className={typography.muted + ' block'}>Start</span><span className="font-medium text-slate-900">{formatDate(task.startDate)}</span></div>
      </div>

      {/* Meta fields — secondary */}
      <div className="grid grid-cols-2 gap-3">
        <div><span className={typography.muted + ' block'}>Created</span><span className={typography.muted}>{formatDate(task.createdAt)}</span></div>
        {task.actualStartDate && <div><span className={typography.muted + ' block'}>Actual Start</span><span className={typography.muted}>{formatDate(task.actualStartDate)}</span></div>}
        {task.actualEndDate && <div><span className={typography.muted + ' block'}>Actual End</span><span className={typography.muted}>{formatDate(task.actualEndDate)}</span></div>}
        {task.sprintId && <div><span className={typography.muted + ' block'}>Sprint</span><span className={typography.muted}>Active</span></div>}
        {task.phaseId && <div><span className={typography.muted + ' block'}>Phase</span><span className={typography.muted}>Assigned</span></div>}
      </div>

      {/* Estimation */}
      {(task.estimatePoints != null || task.estimateHours != null || task.actualHours != null || task.remainingHours != null) && (
        <div className="border-t pt-3 mt-3 space-y-1">
          <span className={typography.muted + ' block text-xs font-semibold uppercase'}>Estimates</span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {task.estimatePoints != null && <div><span className={typography.muted + ' block'}>Points</span><span className="font-medium">{task.estimatePoints}</span></div>}
            {task.estimateHours != null && <div><span className={typography.muted + ' block'}>Est. Hours</span><span className="font-medium">{task.estimateHours}h</span></div>}
            {task.remainingHours != null && <div><span className={typography.muted + ' block'}>Remaining</span><span className="font-medium">{task.remainingHours}h</span></div>}
            {task.actualHours != null && <div><span className={typography.muted + ' block'}>Actual</span><span className="font-medium">{task.actualHours}h</span></div>}
          </div>
        </div>
      )}

      {/* Schedule */}
      {hasScheduleData && (
        <div className="rounded-lg border p-3 space-y-2" data-testid="schedule-section">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">Schedule</h4>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${schedCfg.color}`}>{schedCfg.label}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {task.startDate && <div><span className="text-gray-400 block">Planned</span><span className="font-medium">{formatDate(task.startDate)} → {formatDate(task.dueDate)}</span></div>}
            {task.actualStartDate && (
              <div><span className="text-gray-400 block">Actual</span><span className="font-medium">
                {formatDate(task.actualStartDate)}{task.actualEndDate ? ` → ${formatDate(task.actualEndDate)}` : sched.forecastEndDate ? ` → ~${formatDate(sched.forecastEndDate)}` : ' → in progress'}
              </span></div>
            )}
            {sched.endVarianceDays != null && (
              <div><span className="text-gray-400 block">Variance</span><span className={`font-medium ${sched.endVarianceDays > 0 ? 'text-red-600' : sched.endVarianceDays < 0 ? 'text-green-600' : ''}`}>{sched.endVarianceDays > 0 ? '+' : ''}{sched.endVarianceDays}d</span></div>
            )}
            {sched.plannedDurationDays != null && (
              <div><span className="text-gray-400 block">Duration</span><span className="font-medium">{sched.plannedDurationDays}d planned{sched.actualDurationDays != null ? ` / ${sched.actualDurationDays}d actual` : ''}</span></div>
            )}
          </div>
        </div>
      )}

      {/* Dependencies quick summary */}
      {depsCount > 0 && (
        <div className="rounded-lg bg-gray-50 p-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Dependencies</h4>
          {detail.dependencies.blockedBy.length > 0 && <p className="text-xs text-red-600">Blocked by {detail.dependencies.blockedBy.length} task(s)</p>}
          {detail.dependencies.blocking.length > 0 && <p className="text-xs text-orange-600">Blocking {detail.dependencies.blocking.length} task(s)</p>}
        </div>
      )}

      {/* Acceptance criteria */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Acceptance Criteria</h4>
        <AcceptanceCriteriaEditor items={task.acceptanceCriteria || []} onSave={onSaveAC} />
      </div>

      {/* Subtasks */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase">
            Subtasks
            {detail.subtaskCount > 0 && <span className="ml-1.5 text-[10px] font-normal text-gray-400">{detail.subtaskDoneCount} of {detail.subtaskCount} complete</span>}
          </h4>
        </div>
        {detail.subtaskCount > 0 && (
          <div className="mb-3"><div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${Math.round((detail.subtaskDoneCount / detail.subtaskCount) * 100)}%` }} /></div></div>
        )}
        <div className="space-y-1">
          {(detail.subtasks || []).map((sub) => (
            <div key={sub.id} className="flex items-center gap-2 group py-1 px-1 rounded hover:bg-gray-50">
              <button onClick={(e) => { e.stopPropagation(); onToggleSubtask(sub.id, sub.status); }} disabled={!canEditWork} className="shrink-0">
                {sub.status === 'DONE' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4 text-gray-300 group-hover:text-gray-400" />}
              </button>
              <span
                className={`text-sm flex-1 truncate cursor-pointer hover:text-indigo-600 ${sub.status === 'DONE' ? 'line-through text-gray-400' : 'text-gray-700'}`}
                onClick={() => { onClose(); setTimeout(() => { window.dispatchEvent(new CustomEvent('open-task-detail', { detail: { taskId: sub.id } })); }, 100); }}
              >
                {sub.title}
              </span>
              {sub.dueDate && <span className="text-[10px] text-gray-400 shrink-0">{new Date(sub.dueDate).toLocaleDateString()}</span>}
            </div>
          ))}
        </div>
        {canEditWork && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text" value={newSubtaskTitle} onChange={(e) => onNewSubtaskTitleChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onCreateSubtask(); if (e.key === 'Escape') onNewSubtaskTitleChange(''); }}
              placeholder="Add subtask..."
              className="flex-1 text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300"
            />
            {newSubtaskTitle.trim() && (
              <button onClick={onCreateSubtask} disabled={creatingSubtask} className="px-2.5 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
                {creatingSubtask ? 'Adding...' : 'Add'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}