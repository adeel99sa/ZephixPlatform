/**
 * Compact table-cell renderer for task attribute values.
 * Reuses design-system primitives (not artifact CustomFieldRenderer — form-coupled).
 */
import { useState, type ReactNode } from 'react';

import { DatePicker } from '@/components/ui/form/DatePicker';
import { Rating } from '@/components/ui/Rating';

import type { AttributeDefinition } from '../attributes.types';

const EMPTY = <span className="text-slate-400">—</span>;

export type AttributeCellProps = {
  definition: AttributeDefinition;
  value: unknown;
  canEdit: boolean;
  isEditing: boolean;
  error?: string | null;
  onStartEdit: () => void;
  onCommit: (value: unknown) => void;
  onCancel: () => void;
};

function displayValue(definition: AttributeDefinition, value: unknown): ReactNode {
  if (value === null || value === undefined || value === '') return EMPTY;
  switch (definition.dataType) {
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'date':
      return typeof value === 'string'
        ? new Date(value.slice(0, 10)).toLocaleDateString()
        : EMPTY;
    case 'single_select':
      return String(value);
    case 'number':
    case 'integer':
    case 'decimal':
    case 'currency':
    case 'percentage':
      return String(value);
    case 'rating':
      return (
        <Rating
          value={typeof value === 'number' ? value : Number(value) || 0}
          onChange={() => {}}
          readOnly
          label={definition.label}
        />
      );
    case 'text':
    case 'long_text':
      return <span className="truncate block max-w-[140px]">{String(value)}</span>;
    default:
      return String(value);
  }
}

export function AttributeCell({
  definition,
  value,
  canEdit,
  isEditing,
  error,
  onStartEdit,
  onCommit,
  onCancel,
}: AttributeCellProps) {
  const [draft, setDraft] = useState<unknown>(value);
  const errorRing = error ? ' ring-1 ring-red-400' : '';

  if (!isEditing) {
    return (
      <div
        className={`text-sm text-slate-600 ${canEdit ? 'cursor-text' : ''}`}
        onDoubleClick={(e) => {
          if (!canEdit) return;
          e.stopPropagation();
          setDraft(value);
          onStartEdit();
        }}
        data-testid={`attr-cell-display-${definition.id}`}
      >
        {displayValue(definition, value)}
        {error ? (
          <p className="mt-0.5 text-[10px] text-red-600" role="alert" data-testid="attr-cell-inline-error">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  const finish = (next: unknown) => {
    onCommit(next);
  };

  switch (definition.dataType) {
    case 'text':
      return (
        <input
          type="text"
          value={typeof draft === 'string' ? draft : ''}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') finish(draft);
            if (e.key === 'Escape') onCancel();
          }}
          onBlur={() => finish(draft)}
          className={`w-full text-xs border border-indigo-300 rounded px-1 py-0.5${errorRing}`}
          autoFocus
          data-testid={`attr-cell-edit-${definition.id}`}
        />
      );
    case 'number':
    case 'integer':
    case 'decimal':
      return (
        <input
          type="number"
          value={typeof draft === 'number' ? draft : draft === '' ? '' : Number(draft) || ''}
          onChange={(e) => {
            const n = e.target.value === '' ? null : Number(e.target.value);
            setDraft(n);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') finish(draft);
            if (e.key === 'Escape') onCancel();
          }}
          onBlur={() => finish(draft)}
          className={`w-full text-xs border border-indigo-300 rounded px-1 py-0.5${errorRing}`}
          autoFocus
          data-testid={`attr-cell-edit-${definition.id}`}
        />
      );
    case 'date':
      return (
        <DatePicker
          value={typeof draft === 'string' ? draft.slice(0, 10) : ''}
          onChange={(e) => finish(e.target.value || null)}
          className={`text-xs${errorRing}`}
          data-testid={`attr-cell-edit-${definition.id}`}
        />
      );
    case 'single_select':
      return (
        <select
          value={typeof draft === 'string' ? draft : ''}
          onChange={(e) => finish(e.target.value || null)}
          className={`text-xs border border-indigo-300 rounded px-1 py-0.5${errorRing}`}
          autoFocus
          data-testid={`attr-cell-edit-${definition.id}`}
        >
          <option value="">—</option>
          {(definition.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case 'boolean':
      return (
        <select
          value={draft === true ? 'true' : draft === false ? 'false' : ''}
          onChange={(e) => {
            const v = e.target.value;
            finish(v === '' ? null : v === 'true');
          }}
          className={`text-xs border border-indigo-300 rounded px-1 py-0.5${errorRing}`}
          autoFocus
          data-testid={`attr-cell-edit-${definition.id}`}
        >
          <option value="">—</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    case 'rating':
      return (
        <div data-testid={`attr-cell-edit-${definition.id}`}>
          <Rating
            value={typeof draft === 'number' ? draft : Number(draft) || 0}
            onChange={(n) => finish(n)}
            label={definition.label}
            error={error ?? undefined}
          />
        </div>
      );
    default:
      return displayValue(definition, value);
  }
}
