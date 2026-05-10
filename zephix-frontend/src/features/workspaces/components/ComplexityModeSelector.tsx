import { useId } from 'react';

import type { WorkspaceComplexityMode } from '@/features/workspaces/types';

export type ComplexityModeSelectorProps = {
  value: WorkspaceComplexityMode;
  onChange: (value: WorkspaceComplexityMode) => void;
  disabled?: boolean;
  helperText?: string;
};

const OPTIONS: {
  value: WorkspaceComplexityMode;
  title: string;
  description: string;
}[] = [
  {
    value: 'lean',
    title: 'Lean',
    description: 'Minimal governance, fast iteration, small teams',
  },
  {
    value: 'standard',
    title: 'Standard',
    description: 'Balanced governance, recommended for most teams',
  },
  {
    value: 'governed',
    title: 'Governed',
    description: 'Full governance enforcement, regulated environments',
  },
];

/**
 * Workspace complexity mode — labels match backend enum tokens (Lean / Standard / Governed).
 * Used by create modal and settings (PR2 wiring).
 */
export function ComplexityModeSelector({
  value,
  onChange,
  disabled,
  helperText,
}: ComplexityModeSelectorProps) {
  const groupId = useId();

  return (
    <fieldset className="space-y-3" data-testid="complexity-mode-selector">
      <legend id={`${groupId}-legend`} className="text-sm font-medium text-slate-900">
        Workspace complexity mode
      </legend>
      {helperText ? (
        <p id={`${groupId}-hint`} className="text-xs text-slate-600">
          {helperText}
        </p>
      ) : null}
      <div className="space-y-2" role="radiogroup" aria-labelledby={`${groupId}-legend`}>
        {OPTIONS.map((opt) => {
          const id = `${groupId}-${opt.value}`;
          const checked = value === opt.value;
          return (
            <label
              key={opt.value}
              htmlFor={id}
              className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${
                checked ? 'border-blue-500 bg-blue-50/60' : 'border-slate-200 bg-white hover:border-slate-300'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <input
                id={id}
                name={`complexity-mode-${groupId}`}
                type="radio"
                className="mt-1 h-4 w-4 shrink-0 text-blue-600"
                checked={checked}
                disabled={disabled}
                value={opt.value}
                onChange={() => onChange(opt.value)}
                data-testid={`complexity-mode-${opt.value}`}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-900">{opt.title}</span>
                <span className="mt-0.5 block text-xs text-slate-600">{opt.description}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
