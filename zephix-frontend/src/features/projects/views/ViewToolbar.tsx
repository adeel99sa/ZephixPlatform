/**
 * ViewToolbar — Phase 3B: stripped to working controls only.
 *
 * Only Search and Show Closed actually affect the rendered data in ProjectTableTab.
 * Filter, Sort, Fields, GroupBy, and Save View were disconnected from actual
 * data rendering (changes stored in toolbarConfig state but never applied).
 *
 * Removed controls:
 * - FilterDropdown: writes to toolbarConfig.filters, never read by rendering logic
 * - Sort: writes to toolbarConfig.sortBy, table uses its own sortField state
 * - ViewSettingsPanel (Fields): disconnected from actual columns state
 * - GroupByControl: grouping is stubbed ("not yet implemented")
 * - Save View: never rendered (no parent passes canSave/onSaveView)
 *
 * These can be re-added when properly wired to the data pipeline.
 */

import React, { useState } from 'react';
import { Search, Eye, EyeOff, X } from 'lucide-react';

interface ToolbarConfig {
  search?: string;
  showClosed?: boolean;
}

interface Props {
  viewType: string;
  config: ToolbarConfig;
  onChange: (partial: Partial<ToolbarConfig>) => void;
  className?: string;
}

export const ViewToolbar: React.FC<Props> = ({
  config,
  onChange,
  className,
}) => {
  const [searchExpanded, setSearchExpanded] = useState(!!config.search);

  return (
    <div
      className={`flex items-center gap-1.5 flex-wrap ${className ?? ''}`}
      data-testid="view-toolbar"
    >
      {/* ─── Search ─── */}
      {searchExpanded ? (
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md px-2 py-1">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={config.search ?? ''}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search tasks..."
            className="text-xs bg-transparent border-0 outline-none w-40 placeholder-slate-400"
            autoFocus
          />
          <button
            onClick={() => {
              setSearchExpanded(false);
              onChange({ search: '' });
            }}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setSearchExpanded(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md"
          title="Search"
        >
          <Search className="h-3.5 w-3.5" />
          Search
        </button>
      )}

      {/* ─── Show Closed ─── */}
      <button
        onClick={() => onChange({ showClosed: !config.showClosed })}
        className={`
          flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors
          ${config.showClosed
            ? 'bg-green-100 text-green-700'
            : 'text-slate-600 hover:bg-slate-100'}
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
    </div>
  );
};

export default ViewToolbar;
