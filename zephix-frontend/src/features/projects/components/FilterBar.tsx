/**
 * FilterBar — Sprint 1: Multi-field filtering for project task views.
 *
 * Works in Table and List views via URL search params.
 * Reusable: accepts option data as props, emits filter changes via callback.
 */

import React, { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X, Filter } from 'lucide-react';
import type { WorkspaceMemberRow } from '@/features/workspaces/members/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface FilterBarOptions {
  members: WorkspaceMemberRow[];
  phases: Array<{ id: string; name: string }>;
  statuses: string[];
  priorities: string[];
  types: string[];
}

export interface TaskFilters {
  status?: string[];
  priority?: string[];
  assigneeUserId?: string[];
  phaseId?: string[];
  type?: string[];
  tags?: string;
  dueFrom?: string;
  dueTo?: string;
}

const FILTER_KEYS: (keyof TaskFilters)[] = [
  'status', 'priority', 'assigneeUserId', 'phaseId', 'type', 'tags', 'dueFrom', 'dueTo',
];

/* ------------------------------------------------------------------ */
/*  URL <-> Filter helpers                                             */
/* ------------------------------------------------------------------ */

export function filtersFromParams(params: URLSearchParams): TaskFilters {
  const f: TaskFilters = {};
  const status = params.get('status');
  if (status) f.status = status.split(',');
  const priority = params.get('priority');
  if (priority) f.priority = priority.split(',');
  const assignee = params.get('assigneeUserId');
  if (assignee) f.assigneeUserId = assignee.split(',');
  const phase = params.get('phaseId');
  if (phase) f.phaseId = phase.split(',');
  const type = params.get('type');
  if (type) f.type = type.split(',');
  const tags = params.get('tags');
  if (tags) f.tags = tags;
  const dueFrom = params.get('dueFrom');
  if (dueFrom) f.dueFrom = dueFrom;
  const dueTo = params.get('dueTo');
  if (dueTo) f.dueTo = dueTo;
  return f;
}

export function filtersToParams(filters: TaskFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (filters.status?.length) p.status = filters.status.join(',');
  if (filters.priority?.length) p.priority = filters.priority.join(',');
  if (filters.assigneeUserId?.length) p.assigneeUserId = filters.assigneeUserId.join(',');
  if (filters.phaseId?.length) p.phaseId = filters.phaseId.join(',');
  if (filters.type?.length) p.type = filters.type.join(',');
  if (filters.tags) p.tags = filters.tags;
  if (filters.dueFrom) p.dueFrom = filters.dueFrom;
  if (filters.dueTo) p.dueTo = filters.dueTo;
  return p;
}

/** Convert TaskFilters to ListTasksParams-compatible shape (for API call) */
export function filtersToApiParams(filters: TaskFilters): Record<string, string | undefined> {
  const p: Record<string, string | undefined> = {};
  if (filters.status?.length) p.includeStatuses = filters.status.join(',');
  if (filters.priority?.length === 1) p.priority = filters.priority[0];
  // Multi-priority: backend only supports single priority filter, so use includeStatuses pattern
  // For now, if multiple priorities, we'll handle client-side filtering
  if (filters.assigneeUserId?.length === 1) p.assigneeUserId = filters.assigneeUserId[0];
  if (filters.phaseId?.length === 1) p.phaseId = filters.phaseId[0];
  if (filters.type?.length === 1) p.type = filters.type[0];
  if (filters.tags) p.tags = filters.tags;
  if (filters.dueFrom) p.dueFrom = filters.dueFrom;
  if (filters.dueTo) p.dueTo = filters.dueTo;
  return p;
}

export function isFilterActive(filters: TaskFilters): boolean {
  return FILTER_KEYS.some((k) => {
    const v = filters[k];
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  });
}

export function activeFilterCount(filters: TaskFilters): number {
  return FILTER_KEYS.filter((k) => {
    const v = filters[k];
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  }).length;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface FilterBarProps {
  options: FilterBarOptions;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({ options, className }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);
  const count = activeFilterCount(filters);

  const updateFilter = useCallback(
    (key: keyof TaskFilters, value: string[] | string | undefined) => {
      const next = { ...filters };
      if (!value || (Array.isArray(value) && value.length === 0) || value === '') {
        delete next[key];
      } else {
        (next as any)[key] = value;
      }
      const params = filtersToParams(next);
      setSearchParams(params, { replace: true });
    },
    [filters, setSearchParams],
  );

  const toggleMulti = useCallback(
    (key: 'status' | 'priority' | 'assigneeUserId' | 'phaseId' | 'type', val: string) => {
      const current = filters[key] || [];
      const next = current.includes(val)
        ? current.filter((v) => v !== val)
        : [...current, val];
      updateFilter(key, next);
    },
    [filters, updateFilter],
  );

  const clearAll = () => setSearchParams({}, { replace: true });

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ''}`} data-testid="filter-bar">
      <Filter className="h-3.5 w-3.5 text-slate-500" />

      {/* Status multi-select */}
      <FilterDropdown
        label="Status"
        options={options.statuses.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
        selected={filters.status || []}
        onToggle={(v) => toggleMulti('status', v)}
      />

      {/* Priority multi-select */}
      <FilterDropdown
        label="Priority"
        options={options.priorities.map((p) => ({ value: p, label: p }))}
        selected={filters.priority || []}
        onToggle={(v) => toggleMulti('priority', v)}
      />

      {/* Assignee multi-select */}
      <FilterDropdown
        label="Assignee"
        options={options.members.map((m) => ({ value: m.userId, label: m.name || m.email }))}
        selected={filters.assigneeUserId || []}
        onToggle={(v) => toggleMulti('assigneeUserId', v)}
      />

      {/* Phase multi-select */}
      {options.phases.length > 0 && (
        <FilterDropdown
          label="Phase"
          options={options.phases.map((p) => ({ value: p.id, label: p.name }))}
          selected={filters.phaseId || []}
          onToggle={(v) => toggleMulti('phaseId', v)}
        />
      )}

      {/* Type multi-select */}
      <FilterDropdown
        label="Type"
        options={options.types.map((t) => ({ value: t, label: t }))}
        selected={filters.type || []}
        onToggle={(v) => toggleMulti('type', v)}
      />

      {/* Due date range */}
      <div className="flex items-center gap-1">
        <input
          type="date"
          value={filters.dueFrom || ''}
          onChange={(e) => updateFilter('dueFrom', e.target.value || undefined)}
          className="text-[11px] border border-slate-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
          title="Due from"
        />
        <span className="text-[10px] text-slate-400">–</span>
        <input
          type="date"
          value={filters.dueTo || ''}
          onChange={(e) => updateFilter('dueTo', e.target.value || undefined)}
          className="text-[11px] border border-slate-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
          title="Due to"
        />
      </div>

      {/* Tags text */}
      <input
        type="text"
        placeholder="Tags..."
        value={filters.tags || ''}
        onChange={(e) => updateFilter('tags', e.target.value || undefined)}
        className="text-[11px] border border-slate-200 rounded px-2 py-0.5 w-24 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
      />

      {/* Clear all */}
      {count > 0 && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 ml-1"
          data-testid="clear-filters"
        >
          <X className="h-3 w-3" />
          Clear ({count})
        </button>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Filter dropdown sub-component                                      */
/* ------------------------------------------------------------------ */

interface DropdownOption {
  value: string;
  label: string;
}

const FilterDropdown: React.FC<{
  label: string;
  options: DropdownOption[];
  selected: string[];
  onToggle: (value: string) => void;
}> = ({ label, options, selected, onToggle }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const hasSelection = selected.length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`text-[11px] px-2 py-0.5 rounded-md border ${
          hasSelection
            ? 'border-indigo-300 bg-indigo-50 text-indigo-700 font-medium'
            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
        }`}
      >
        {label}{hasSelection ? ` (${selected.length})` : ''}
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-30 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 min-w-[160px] max-h-56 overflow-y-auto">
          {options.map((opt) => {
            const isChecked = selected.includes(opt.value);
            return (
              <label
                key={opt.value}
                className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer text-xs"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggle(opt.value)}
                  className="h-3 w-3 rounded border-slate-300 text-indigo-600"
                />
                <span className="truncate">{opt.label}</span>
              </label>
            );
          })}
          {options.length === 0 && (
            <p className="text-xs text-slate-400 px-2 py-1">No options</p>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
