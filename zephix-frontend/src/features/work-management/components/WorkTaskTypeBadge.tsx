import {
  WORK_TASK_TYPE_COLORS,
  formatWorkTaskTypeLabel,
  normalizeWorkTaskType,
  type WorkTaskType,
} from '../workTaskType.constants';

export type WorkTaskTypeBadgeProps = {
  type: WorkTaskType | string | null | undefined;
  className?: string;
  'data-testid'?: string;
};

/**
 * Type badge — matches status/priority pill pattern (`px-2 py-0.5 rounded text-xs font-medium`).
 */
export function WorkTaskTypeBadge({
  type,
  className = '',
  'data-testid': testId,
}: WorkTaskTypeBadgeProps) {
  const normalized = normalizeWorkTaskType(type);
  const color = WORK_TASK_TYPE_COLORS[normalized];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase ${color} ${className}`.trim()}
      data-testid={testId ?? `work-task-type-badge-${normalized}`}
    >
      {formatWorkTaskTypeLabel(normalized)}
    </span>
  );
}
