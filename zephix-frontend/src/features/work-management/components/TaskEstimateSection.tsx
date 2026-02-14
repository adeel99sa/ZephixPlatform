// ─────────────────────────────────────────────────────────────────────────────
// Task Estimate Section — Dual estimation (points + hours)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { Hash, Clock, Timer, Activity } from 'lucide-react';
import type { WorkTask, UpdateTaskPatch } from '../workTasks.api';

interface Props {
  task: WorkTask;
  onUpdate: (patch: UpdateTaskPatch) => Promise<void>;
  readOnly?: boolean;
}

function NumericInput({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  step,
  readOnly,
}: {
  label: string;
  icon: React.ElementType;
  value: number | null;
  onChange: (val: number | null) => void;
  placeholder?: string;
  step?: string;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEdit = () => {
    if (readOnly) return;
    setDraft(value != null ? String(value) : '');
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed === '') {
      onChange(null);
    } else {
      const num = Number(trimmed);
      if (!isNaN(num) && num > 0) {
        onChange(num);
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
      <span className="text-xs text-gray-500 w-24 shrink-0">{label}</span>
      {editing ? (
        <input
          type="number"
          min="0"
          step={step || '1'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          className="w-20 rounded border px-2 py-0.5 text-xs"
          autoFocus
        />
      ) : (
        <button
          onClick={startEdit}
          disabled={readOnly}
          className="text-xs text-gray-900 hover:text-indigo-600 disabled:cursor-default"
        >
          {value != null ? value : '—'}
        </button>
      )}
    </div>
  );
}

export function TaskEstimateSection({ task, onUpdate, readOnly }: Props) {
  const handleChange = useCallback(
    async (field: keyof UpdateTaskPatch, value: number | null) => {
      await onUpdate({ [field]: value });
    },
    [onUpdate],
  );

  return (
    <div className="space-y-2" data-testid="task-estimate-section">
      <h4 className="text-xs font-semibold text-gray-500 uppercase">
        Estimates
      </h4>
      <div className="space-y-1.5">
        <NumericInput
          label="Points"
          icon={Hash}
          value={task.estimatePoints}
          onChange={(v) => handleChange('estimatePoints', v)}
          readOnly={readOnly}
        />
        <NumericInput
          label="Hours"
          icon={Clock}
          value={task.estimateHours}
          onChange={(v) => handleChange('estimateHours', v)}
          step="0.5"
          readOnly={readOnly}
        />
        <NumericInput
          label="Remaining"
          icon={Timer}
          value={task.remainingHours}
          onChange={(v) => handleChange('remainingHours', v)}
          step="0.5"
          readOnly={readOnly}
        />
        <NumericInput
          label="Actual"
          icon={Activity}
          value={task.actualHours}
          onChange={(v) => handleChange('actualHours', v)}
          step="0.5"
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
