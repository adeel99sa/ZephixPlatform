import { useEffect, useRef, useState } from 'react';

import type { ArtifactItemPriority } from '@/api/project-artifacts.types';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

export type ArtifactItemsFilterState = {
  search: string;
  assignee: string;
  priority: '' | ArtifactItemPriority;
};

export const EMPTY_ARTIFACT_FILTERS: ArtifactItemsFilterState = {
  search: '',
  assignee: '',
  priority: '',
};

type Props = {
  value: ArtifactItemsFilterState;
  onChange: (next: ArtifactItemsFilterState) => void;
};

const PRIORITY_OPTIONS: { value: '' | ArtifactItemPriority; label: string }[] = [
  { value: '', label: 'All priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
];

export function ArtifactItemsFilterBar({ value, onChange }: Props) {
  const [searchDraft, setSearchDraft] = useState(value.search);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    setSearchDraft(value.search);
  }, [value.search]);

  const debouncedSearch = useDebouncedCallback((q: string) => {
    onChange({ ...valueRef.current, search: q });
  }, 300);

  const hasActiveFilters =
    value.search.trim() !== '' || value.assignee.trim() !== '' || value.priority !== '';

  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2"
      data-testid="artifact-items-filter-bar"
    >
      <input
        type="search"
        placeholder="Search items…"
        value={searchDraft}
        onChange={(e) => {
          const q = e.target.value;
          setSearchDraft(q);
          debouncedSearch(q);
        }}
        className="min-w-[8rem] flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs"
        aria-label="Search artifact items"
      />
      <input
        type="text"
        placeholder="Assignee ID"
        value={value.assignee}
        onChange={(e) => onChange({ ...value, assignee: e.target.value })}
        className="w-28 rounded-md border border-slate-200 px-2 py-1 text-xs"
        aria-label="Filter by assignee"
      />
      <select
        value={value.priority}
        onChange={(e) =>
          onChange({
            ...value,
            priority: e.target.value as ArtifactItemsFilterState['priority'],
          })
        }
        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700"
        aria-label="Filter by priority"
      >
        {PRIORITY_OPTIONS.map((opt) => (
          <option key={opt.label} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hasActiveFilters ? (
        <button
          type="button"
          className="text-xs font-medium text-blue-700 hover:underline"
          onClick={() => {
            setSearchDraft('');
            onChange(EMPTY_ARTIFACT_FILTERS);
          }}
          data-testid="artifact-filters-clear"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
