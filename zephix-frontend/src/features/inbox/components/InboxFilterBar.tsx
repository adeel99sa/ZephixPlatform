import type { InboxFilterOptions, InboxSeverity, InboxStatus, InboxType } from "../types";

type InboxFilterBarProps = {
  options: InboxFilterOptions | null;
  type: InboxType | "all";
  setType: (value: InboxType | "all") => void;
  projectId: string | "all";
  setProjectId: (value: string | "all") => void;
  severity: InboxSeverity | "all";
  setSeverity: (value: InboxSeverity | "all") => void;
  status: InboxStatus | "all";
  setStatus: (value: InboxStatus | "all") => void;
  unreadFirst: boolean;
  setUnreadFirst: (value: boolean) => void;
  groupByDate: boolean;
  setGroupByDate: (value: boolean) => void;
  sort: "newest" | "oldest";
  setSort: (value: "newest" | "oldest") => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
};

export function InboxFilterBar({
  options,
  type,
  setType,
  projectId,
  setProjectId,
  severity,
  setSeverity,
  status,
  setStatus,
  unreadFirst,
  setUnreadFirst,
  groupByDate,
  setGroupByDate,
  sort,
  setSort,
  hasActiveFilters,
  onClearFilters,
}: InboxFilterBarProps) {
  return (
    <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-6">
      <label className="text-xs text-slate-600">
        Type
        <select
          value={type}
          onChange={(e) => setType(e.target.value as InboxType | "all")}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="all">All types</option>
          {(options?.types || []).map((itemType) => (
            <option key={itemType} value={itemType}>
              {itemType.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs text-slate-600">
        Project
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="all">All projects</option>
          {(options?.projects || []).map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs text-slate-600">
        Severity
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as InboxSeverity | "all")}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="all">All</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </label>

      <label className="text-xs text-slate-600">
        Status
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as InboxStatus | "all")}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="all">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
          <option value="later">Later</option>
          <option value="cleared">Cleared</option>
        </select>
      </label>

      <label className="text-xs text-slate-600">
        Sort
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </label>

      <div className="flex items-end gap-3 pb-1 text-xs text-slate-700">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={unreadFirst}
            onChange={(e) => setUnreadFirst(e.target.checked)}
          />
          Unread first
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={groupByDate}
            onChange={(e) => setGroupByDate(e.target.checked)}
          />
          Group by date
        </label>
        <button
          type="button"
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}

