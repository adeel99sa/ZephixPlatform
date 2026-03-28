/**
 * ViewToolbar — UX Step 11
 *
 * Unified toolbar rendered across all views (List, Board, Gantt, Table).
 * Components: Search | Filters | Group By | Sort | Fields | Show Closed | Save View
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Eye,
  EyeOff,
  Save,
  X,
  AlertOctagon,
} from 'lucide-react';
import { GroupByControl } from './GroupByControl';
import { ViewSettingsPanel } from './ViewSettingsPanel';
import { SORTABLE_FIELDS, getDefaultVisibleFields } from './TaskFieldRegistry';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface ToolbarFilter {
  field: string;
  op: string;
  value: unknown;
}

interface ToolbarConfig {
  search?: string;
  groupBy?: string | null;
  sortBy?: string | null;
  sortDir?: 'asc' | 'desc';
  visibleFields?: string[];
  showClosed?: boolean;
  filters?: ToolbarFilter[];
}

interface Props {
  /** Current view type — used for default fields */
  viewType: string;
  /** Current config values */
  config: ToolbarConfig;
  /** Callback when any config value changes */
  onChange: (partial: Partial<ToolbarConfig>) => void;
  /** Callback to save the current view config */
  onSaveView?: () => void;
  /** Whether save is available */
  canSave?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const ViewToolbar: React.FC<Props> = ({
  viewType,
  config,
  onChange,
  onSaveView,
  canSave,
  className,
}) => {
  const [searchExpanded, setSearchExpanded] = useState(!!config.search);
  const [sortOpen, setSortOpen] = useState(false);

  const visibleFields =
    config.visibleFields ?? getDefaultVisibleFields(viewType);

  return (
    <div
      className={`flex items-center gap-1.5 flex-wrap ${className ?? ''}`}
      data-testid="view-toolbar"
    >
      {/* ─── Search ─── */}
      {searchExpanded ? (
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md px-2 py-1">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          {/* NOTE: Search input fires onChange on every keystroke. Consider debouncing for better performance. */}
          <input
            type="text"
            value={config.search ?? ''}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search tasks..."
            className="text-xs bg-transparent border-0 outline-none w-40 placeholder-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
            autoFocus
          />
          <button
            onClick={() => {
              setSearchExpanded(false);
              onChange({ search: '' });
            }}
            className="text-slate-400 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setSearchExpanded(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
          title="Search"
        >
          <Search className="h-3.5 w-3.5" />
          Search
        </button>
      )}

      {/* ─── Filters ─── */}
      <FilterDropdown config={config} onChange={onChange} />

      {/* ─── Group By ─── */}
      <GroupByControl
        value={config.groupBy ?? null}
        onChange={(groupBy) => onChange({ groupBy })}
      />

      {/* ─── Sort ─── */}
      <div className="relative">
        <button
          onClick={() => setSortOpen((o) => !o)}
          className={`
            flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors
            ${config.sortBy
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-slate-600 hover:bg-slate-100'}
            focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1
          `}
          title="Sort"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {config.sortBy
            ? `Sort: ${SORTABLE_FIELDS.find((f) => f.key === config.sortBy)?.label ?? config.sortBy}`
            : 'Sort'}
        </button>
        {sortOpen && (
          <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
            <button
              onClick={() => {
                onChange({ sortBy: null, sortDir: 'desc' });
                setSortOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm ${!config.sortBy ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'} focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1`}
            >
              Default
            </button>
            {SORTABLE_FIELDS.map((field) => (
              <button
                key={field.key}
                onClick={() => {
                  const isSame = config.sortBy === field.key;
                  onChange({
                    sortBy: field.key,
                    sortDir: isSame && config.sortDir === 'asc' ? 'desc' : 'asc',
                  });
                  setSortOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm ${config.sortBy === field.key ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'} focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1`}
              >
                {field.label}
                {config.sortBy === field.key && (
                  <span className="ml-1 text-[10px]">
                    ({config.sortDir === 'asc' ? 'ASC' : 'DESC'})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Fields ─── */}
      <ViewSettingsPanel
        visibleFields={visibleFields}
        onFieldsChange={(fields) => onChange({ visibleFields: fields })}
      />

      {/* ─── Show Closed ─── */}
      <button
        onClick={() => onChange({ showClosed: !config.showClosed })}
        className={`
          flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors
          ${config.showClosed
            ? 'bg-green-100 text-green-700'
            : 'text-slate-600 hover:bg-slate-100'}
          focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1
        `}
        title={config.showClosed ? 'Hide closed' : 'Show closed'}
      >
        {config.showClosed ? (
          <Eye className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5" />
        )}
        {config.showClosed ? 'Showing closed' : 'Show closed'}
      </button>

      {/* ─── Save View ─── */}
      {canSave && onSaveView && (
        <button
          onClick={onSaveView}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-md ml-auto focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
          title="Save view"
        >
          <Save className="h-3.5 w-3.5" />
          Save view
        </button>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  FilterDropdown                                                     */
/* ------------------------------------------------------------------ */

const QUICK_FILTERS = [
  {
    id: 'blocked',
    label: 'Blocked',
    icon: AlertOctagon,
    filter: { field: 'status', op: 'eq', value: 'BLOCKED' },
  },
  {
    id: 'high-priority',
    label: 'High Priority',
    icon: AlertOctagon,
    filter: { field: 'priority', op: 'in', value: ['HIGH', 'CRITICAL'] },
  },
  {
    id: 'overdue',
    label: 'Overdue',
    icon: AlertOctagon,
    filter: { field: 'dueDate', op: 'lt', value: new Date().toISOString().split('T')[0] },
  },
];

function FilterDropdown({
  config,
  onChange,
}: {
  config: ToolbarConfig;
  onChange: (partial: Partial<ToolbarConfig>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const activeFilters = config.filters ?? [];
  const hasActive = activeFilters.length > 0;

  const isFilterActive = (filterId: string) => {
    const qf = QUICK_FILTERS.find((f) => f.id === filterId);
    if (!qf) return false;
    return activeFilters.some(
      (af) => af.field === qf.filter.field && af.op === qf.filter.op,
    );
  };

  const toggleFilter = (filterId: string) => {
    const qf = QUICK_FILTERS.find((f) => f.id === filterId);
    if (!qf) return;

    if (isFilterActive(filterId)) {
      // Remove
      onChange({
        filters: activeFilters.filter(
          (af) => !(af.field === qf.filter.field && af.op === qf.filter.op),
        ),
      });
    } else {
      // Add
      onChange({
        filters: [...activeFilters, qf.filter],
      });
    }
  };

  const clearAll = () => {
    onChange({ filters: [] });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`
          flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors
          ${hasActive
            ? 'bg-indigo-100 text-indigo-700'
            : 'text-slate-600 hover:bg-slate-100'}
          focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1
        `}
        title="Filters"
      >
        <Filter className="h-3.5 w-3.5" />
        {hasActive ? `Filter (${activeFilters.length})` : 'Filter'}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
          <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Quick Filters
          </div>
          {QUICK_FILTERS.map((qf) => {
            const active = isFilterActive(qf.id);
            return (
              <button
                key={qf.id}
                onClick={() => toggleFilter(qf.id)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
                  active
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-700 hover:bg-slate-50'
                } focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1`}
              >
                <span
                  className={`w-3 h-3 rounded border flex items-center justify-center ${
                    active
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'border-slate-300'
                  }`}
                >
                  {active && (
                    <svg
                      className="w-2 h-2 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={4}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </span>
                {qf.label}
              </button>
            );
          })}
          {hasActive && (
            <>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={clearAll}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
              >
                Clear all filters
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ViewToolbar;
