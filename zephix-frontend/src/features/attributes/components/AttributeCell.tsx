/**
 * Compact table-cell renderer for task attribute values.
 * Reuses design-system primitives (not artifact CustomFieldRenderer — form-coupled).
 */
import { useEffect, useState, type ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';

import { DatePicker } from '@/components/ui/form/DatePicker';
import { Rating } from '@/components/ui/Rating';
import { GradientAvatar } from '@/components/ui/GradientAvatar';

import type { AttributeDefinition } from '../attributes.types';
import {
  choiceForValue,
  currencyCodeLabel,
  durationUnitLabel,
  getSelectChoiceLabels,
  getSelectChoices,
} from '../attributeOptions.utils';
import { normalizeAttributeValueFromApi } from '../attributeValue.utils';

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
  resolveUserLabel?: (userId: string) => string;
};

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function formatCurrency(value: number, code: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function SelectChip({ label, color }: { label: string; color?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
      style={{ backgroundColor: color ?? '#64748b' }}
    >
      {label}
    </span>
  );
}

function displayValue(
  definition: AttributeDefinition,
  rawValue: unknown,
  resolveUserLabel?: (userId: string) => string,
): ReactNode {
  const value = normalizeAttributeValueFromApi(definition.dataType, rawValue);
  if (isEmptyValue(value)) return EMPTY;

  switch (definition.dataType) {
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'date':
      return typeof value === 'string'
        ? new Date(value.slice(0, 10)).toLocaleDateString()
        : EMPTY;
    case 'datetime':
      return typeof value === 'string' ? new Date(value).toLocaleString() : EMPTY;
    case 'single_select': {
      const label = String(value);
      const choice = choiceForValue(definition, label);
      return <SelectChip label={choice?.label ?? label} color={choice?.color} />;
    }
    case 'multi_select': {
      const labels = (value as unknown[]).map(String);
      if (labels.length === 0) return EMPTY;
      return (
        <span className="flex flex-wrap gap-1">
          {labels.map((label) => {
            const choice = choiceForValue(definition, label);
            return (
              <SelectChip
                key={label}
                label={choice?.label ?? label}
                color={choice?.color}
              />
            );
          })}
        </span>
      );
    }
    case 'integer':
      return Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
    case 'decimal':
      return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
    case 'currency':
      return formatCurrency(Number(value), currencyCodeLabel(definition));
    case 'percentage':
      return `${Number(value)}%`;
    case 'duration':
      return `${Number(value)} ${durationUnitLabel(definition)}`;
    case 'rating':
      return (
        <Rating
          value={typeof value === 'number' ? value : Number(value) || 0}
          onChange={() => {}}
          readOnly
          label={definition.label}
        />
      );
    case 'people': {
      const ids = (value as unknown[]).map(String);
      if (ids.length === 0) return EMPTY;
      return (
        <span className="flex items-center -space-x-1">
          {ids.slice(0, 3).map((id) => {
            const name = resolveUserLabel?.(id) ?? id.slice(0, 8);
            return (
              <span key={id} title={name} className="inline-flex ring-2 ring-white rounded-full">
                <GradientAvatar name={name} size={22} />
              </span>
            );
          })}
          {ids.length > 3 ? (
            <span className="ml-2 text-[10px] text-slate-500">+{ids.length - 3}</span>
          ) : null}
        </span>
      );
    }
    case 'url': {
      const href = String(value);
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-indigo-600 hover:underline truncate max-w-[140px]"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          {href.replace(/^https?:\/\//, '')}
        </a>
      );
    }
    case 'email':
      return (
        <a
          href={`mailto:${String(value)}`}
          className="text-indigo-600 hover:underline truncate block max-w-[140px]"
          onClick={(e) => e.stopPropagation()}
        >
          {String(value)}
        </a>
      );
    case 'file_reference':
      return (
        <span className="truncate block max-w-[140px] text-slate-600" title={String(value)}>
          📎 {String(value).slice(0, 12)}…
        </span>
      );
    case 'text':
    case 'long_text':
    case 'number':
      return (
        <span className={`truncate block max-w-[140px] ${definition.dataType === 'long_text' ? 'whitespace-pre-wrap' : ''}`}>
          {String(value)}
        </span>
      );
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
  resolveUserLabel,
}: AttributeCellProps) {
  const normalized = normalizeAttributeValueFromApi(definition.dataType, value);
  const [draft, setDraft] = useState<unknown>(normalized);

  useEffect(() => {
    if (!isEditing) setDraft(normalizeAttributeValueFromApi(definition.dataType, value));
  }, [value, isEditing, definition.dataType]);

  const errorRing = error ? ' ring-1 ring-red-400' : '';

  if (!isEditing) {
    return (
      <div
        className={`text-sm text-slate-600 ${canEdit ? 'cursor-text' : ''}`}
        onDoubleClick={(e) => {
          if (!canEdit) return;
          e.stopPropagation();
          setDraft(normalized);
          onStartEdit();
        }}
        data-testid={`attr-cell-display-${definition.id}`}
      >
        {displayValue(definition, value, resolveUserLabel)}
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

  const numberInput = (step?: string) => (
    <input
      type="number"
      step={step}
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

  switch (definition.dataType) {
    case 'text':
    case 'email':
    case 'url':
    case 'file_reference':
      return (
        <input
          type={definition.dataType === 'email' ? 'email' : definition.dataType === 'url' ? 'url' : 'text'}
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
    case 'long_text':
      return (
        <textarea
          value={typeof draft === 'string' ? draft : ''}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel();
          }}
          onBlur={() => finish(draft)}
          rows={2}
          className={`w-full text-xs border border-indigo-300 rounded px-1 py-0.5${errorRing}`}
          autoFocus
          data-testid={`attr-cell-edit-${definition.id}`}
        />
      );
    case 'number':
    case 'integer':
      return numberInput(definition.dataType === 'integer' ? '1' : 'any');
    case 'decimal':
    case 'currency':
    case 'percentage':
    case 'duration':
      return numberInput('any');
    case 'date':
      return (
        <DatePicker
          value={typeof draft === 'string' ? draft.slice(0, 10) : ''}
          onChange={(e) => finish(e.target.value || null)}
          className={`text-xs${errorRing}`}
          data-testid={`attr-cell-edit-${definition.id}`}
        />
      );
    case 'datetime':
      return (
        <input
          type="datetime-local"
          value={
            typeof draft === 'string' && draft.includes('T')
              ? draft.slice(0, 16)
              : typeof draft === 'string'
                ? `${draft.slice(0, 10)}T00:00`
                : ''
          }
          onChange={(e) => {
            const v = e.target.value;
            finish(v ? new Date(v).toISOString() : null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel();
          }}
          className={`w-full text-xs border border-indigo-300 rounded px-1 py-0.5${errorRing}`}
          autoFocus
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
          {getSelectChoiceLabels(definition).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case 'multi_select': {
      const selected = Array.isArray(draft) ? draft.map(String) : [];
      const labels = getSelectChoiceLabels(definition);
      return (
        <select
          multiple
          value={selected}
          onChange={(e) => {
            const next = Array.from(e.target.selectedOptions).map((o) => o.value);
            setDraft(next);
          }}
          onBlur={() => finish(selected)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') finish(selected);
            if (e.key === 'Escape') onCancel();
          }}
          className={`min-h-[52px] w-full text-xs border border-indigo-300 rounded px-1 py-0.5${errorRing}`}
          autoFocus
          data-testid={`attr-cell-edit-${definition.id}`}
        >
          {labels.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }
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
    case 'people':
      return (
        <input
          type="text"
          placeholder="User IDs, comma-separated"
          value={Array.isArray(draft) ? draft.join(', ') : ''}
          onChange={(e) => {
            const ids = e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            setDraft(ids);
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
    default:
      return displayValue(definition, value, resolveUserLabel);
  }
}

export { getSelectChoices };
