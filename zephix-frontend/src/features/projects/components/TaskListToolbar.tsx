import type { ReactElement } from "react";
import {
  Filter,
  Plus,
  Search,
  Settings,
  ChevronDown,
} from "lucide-react";

import { Button } from "@/components/ui/Button";

export type TaskListToolbarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  showClosed: boolean;
  onShowClosedChange: (value: boolean) => void;
  onAddTask: () => void;
  onFilterClick?: () => void;
  onColumnSettingsClick?: () => void;
  addTaskDisabled?: boolean;
  /** C-6: disables non-essential toolbar affordances when project lifecycle freezes work. */
  surfaceInteractionLocked?: boolean;
};

/**
 * Simplified task list toolbar (C-2): grouping is fixed to Phase for MVP.
 */
export function TaskListToolbar({
  searchQuery,
  onSearchChange,
  showClosed,
  onShowClosedChange,
  onAddTask,
  onFilterClick,
  onColumnSettingsClick,
  addTaskDisabled,
  surfaceInteractionLocked = false,
}: TaskListToolbarProps): ReactElement {
  const toolbarLocked = Boolean(surfaceInteractionLocked);

  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {/* Group by — visual only; MVP always Phase */}
        <div className="relative">
          <select
            aria-label="Group by"
            title="Phase (locked for MVP)"
            className="h-9 cursor-not-allowed appearance-none rounded-md border border-slate-200 bg-slate-50 pl-3 pr-8 text-sm text-slate-700"
            disabled
            value="phase"
          >
            <option value="phase">Phase</option>
            <option value="status">Status</option>
            <option value="assignee">Assignee</option>
            <option value="priority">Priority</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
        </div>

        <button
          type="button"
          onClick={onFilterClick}
          disabled={toolbarLocked}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Filter tasks"
          title="Filters (coming soon)"
        >
          <Filter className="h-4 w-4" aria-hidden />
        </button>

        <div className="relative min-w-[200px] max-w-md flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks…"
            className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            aria-label="Search tasks"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => onShowClosedChange(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Show closed
        </label>

        <button
          type="button"
          onClick={onColumnSettingsClick}
          disabled={toolbarLocked}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Column settings"
          title="Column settings (coming soon)"
        >
          <Settings className="h-4 w-4" aria-hidden />
        </button>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onAddTask}
          disabled={addTaskDisabled}
          className="inline-flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Task
        </Button>
      </div>
    </div>
  );
}
