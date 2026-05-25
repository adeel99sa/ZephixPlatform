import type { ArtifactItemPriority } from '@/api/project-artifacts.types';

export type ArtifactItemsFilterState = {
  search: string;
  assignee: string;
  priority: '' | ArtifactItemPriority;
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
  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2"
      data-testid="artifact-items-filter-bar"
    >
      <input
        type="search"
        placeholder="Search items…"
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
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
    </div>
  );
}
