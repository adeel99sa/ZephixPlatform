import { useId, useState } from 'react';

import type { CustomFieldDefinition } from '@/api/project-artifacts.types';
import { DatePicker } from '@/components/ui/form/DatePicker';
import { Select } from '@/components/ui/form/Select';
import { Textarea } from '@/components/ui/form/Textarea';
import { Input } from '@/components/ui/input/Input';
import { Rating } from '@/components/ui/Rating';
import { AssigneePicker } from '@/features/projects/components/AssigneePicker';
import { useArtifactFieldContext } from '@/features/artifacts/context/ArtifactFieldContext';

export type CustomFieldRendererProps = {
  definition: CustomFieldDefinition;
  value: unknown;
  onChange: (fieldId: string, value: unknown) => void;
  disabled?: boolean;
  error?: string;
};

function fieldLabel(def: CustomFieldDefinition): string {
  return def.required ? `${def.name} *` : def.name;
}

export function CustomFieldRenderer({
  definition,
  value,
  onChange,
  disabled = false,
  error,
}: CustomFieldRendererProps) {
  const fieldId = useId();
  const { assigneeOptions, currentUserId } = useArtifactFieldContext();
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const label = fieldLabel(definition);

  switch (definition.type) {
    case 'text':
      return (
        <Textarea
          id={fieldId}
          label={label}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(definition.id, e.target.value)}
          disabled={disabled}
          error={error}
          rows={3}
        />
      );
    case 'number':
      return (
        <Input
          id={fieldId}
          type="number"
          label={label}
          value={typeof value === 'number' ? value : value === '' ? '' : Number(value) || ''}
          onChange={(e) => {
            const n = e.target.value === '' ? null : Number(e.target.value);
            onChange(definition.id, n);
          }}
          disabled={disabled}
          error={error}
        />
      );
    case 'currency':
      return (
        <div className="space-y-2">
          <label htmlFor={fieldId} className="text-sm font-medium leading-none">
            {label}
          </label>
          <div className="flex">
            <span
              className="inline-flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground"
              aria-hidden
            >
              $
            </span>
            <Input
              id={fieldId}
              type="number"
              className="rounded-l-none"
              value={typeof value === 'number' ? value : value === '' ? '' : Number(value) || ''}
              onChange={(e) => {
                const n = e.target.value === '' ? null : Number(e.target.value);
                onChange(definition.id, n);
              }}
              disabled={disabled}
              error={error}
            />
          </div>
        </div>
      );
    case 'date':
      return (
        <DatePicker
          id={fieldId}
          label={label}
          value={typeof value === 'string' ? value.slice(0, 10) : ''}
          onChange={(e) => onChange(definition.id, e.target.value || null)}
          disabled={disabled}
          error={error}
        />
      );
    case 'enum': {
      const options = (definition.enumValues ?? []).map((opt) => ({
        value: opt,
        label: opt,
      }));
      return (
        <Select
          id={fieldId}
          label={label}
          options={options}
          placeholder="Select…"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(definition.id, e.target.value || null)}
          disabled={disabled}
          error={error}
        />
      );
    }
    case 'person': {
      const assigneeId = typeof value === 'string' ? value : null;
      const display =
        assigneeOptions.find((o) => o.id === assigneeId)?.name ??
        (assigneeId ? 'Assigned' : 'Unassigned');
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">{label}</label>
          <div className="relative">
            <button
              type="button"
              disabled={disabled}
              onClick={() => !disabled && setAssigneeOpen((v) => !v)}
              className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-left text-sm disabled:opacity-50"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${fieldId}-error` : undefined}
            >
              {display}
            </button>
            {assigneeOpen && !disabled ? (
              <AssigneePicker
                value={assigneeId}
                options={assigneeOptions}
                currentUserId={currentUserId}
                onSelect={(userId) => {
                  onChange(definition.id, userId);
                  setAssigneeOpen(false);
                }}
                onClose={() => setAssigneeOpen(false)}
                className="top-full left-0 z-50 mt-1"
              />
            ) : null}
          </div>
          {error ? (
            <p id={`${fieldId}-error`} className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      );
    }
    case 'rating':
      return (
        <div className="space-y-2">
          <span className="text-sm font-medium leading-none">{label}</span>
          <Rating
            value={typeof value === 'number' ? value : Number(value) || 0}
            onChange={(n) => onChange(definition.id, n)}
            readOnly={disabled}
            label={definition.name}
            error={error}
          />
        </div>
      );
    default:
      return null;
  }
}
