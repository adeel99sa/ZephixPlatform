/**
 * CustomizeViewPanel — Phase 13 (2026-04-08)
 *
 * Right-side slide-in panel that opens when the user clicks the Gear
 * icon in the Waterfall table toolbar. Inspired by ClickUp's "Customize
 * view" gear panel — the canonical place to control which columns are
 * visible, how the table is grouped/filtered/sorted, and other
 * view-level settings that don't belong inline in the table.
 *
 * MVP scope (intentionally narrow):
 *   - Two tabs: Fields | View
 *   - Fields tab:
 *     - "Visible" section: lists the 8 default columns from
 *       pm_waterfall_v2.defaultColumns. Each column has a checkbox to
 *       toggle visibility. Toggling off adds the column key to
 *       `hiddenColumnSet` in WaterfallTable; the corresponding header
 *       and cells are then conditionally hidden. The Tasks (title)
 *       column is hard-locked visible — it cannot be hidden because
 *       the row otherwise has no anchor.
 *     - "Hidden" section: lists the 9 columns from
 *       pm_waterfall_v2.hiddenColumns (priority, milestone, dependency,
 *       approvalStatus, documentRequired, description, tags, dateCreated,
 *       dateDone). These are template-declared but not yet rendered by
 *       WaterfallTable — clicking a checkbox here is a no-op for now
 *       and shows a "Coming soon" badge. The list documents the
 *       opt-in pool so customers see what's available.
 *   - View tab: placeholder ("Coming soon") for filter / group / subtask
 *     display / sort / saved view persistence. Future phases hydrate
 *     this tab.
 *
 * Out of scope (deferred):
 *   - Live rendering of hidden-pool columns (priority pill, milestone
 *     toggle, dependency state, etc.) — each needs its own cell
 *     renderer wired through WaterfallTable's body
 *   - View-level settings (filter / group / sort / subtask display /
 *     persistence flags / sharing / export)
 *   - Drag handle for column reorder
 *   - Add custom field
 *   - Field provenance / origin / type-aware menu items
 *
 * Close behavior:
 *   - X button in header
 *   - Escape key
 *   - Click on backdrop overlay
 *
 * Why a separate file from WaterfallTable.tsx:
 *   - WaterfallTable is already large; adding a multi-tab panel inline
 *     would push it past comfortable scrolling
 *   - The panel is a self-contained piece of UI that the table only
 *     needs to mount/unmount and react to changes from via props
 *   - Future expansion (View tab, custom field create, etc.) keeps the
 *     panel growing without affecting the table
 */
import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Loader2, Settings, X } from 'lucide-react';

/**
 * The 8 logical column keys consumed by WaterfallTable. Mirrored here
 * (rather than imported from WaterfallTable) so the panel doesn't need
 * a circular import. The two files MUST stay in sync.
 */
export type WaterfallColumnKey =
  | 'title'
  | 'assignee'
  | 'status'
  | 'startDate'
  | 'dueDate'
  | 'completion'
  | 'duration'
  | 'remarks';

/** Display name for each visible column. Used by the Fields tab list. */
const VISIBLE_COLUMN_LABELS: Record<WaterfallColumnKey, string> = {
  title: 'Tasks',
  assignee: 'Assignee',
  status: 'Status',
  startDate: 'Start date',
  dueDate: 'Due date',
  completion: 'Completion',
  duration: 'Duration (days)',
  remarks: 'Remarks',
};

/**
 * Columns that exist in the pm_waterfall_v2.hiddenColumns pool but are
 * not yet rendered by WaterfallTable. Listed here so the Customize View
 * panel can show them as opt-in options. When a future phase ships
 * the cell renderers, these graduate to fully toggle-able and the
 * "Coming soon" badge is dropped.
 */
const HIDDEN_POOL_LABELS: Array<{ key: string; label: string }> = [
  { key: 'priority', label: 'Priority' },
  { key: 'milestone', label: 'Milestone' },
  { key: 'dependency', label: 'Dependency' },
  { key: 'approvalStatus', label: 'Approval status' },
  { key: 'documentRequired', label: 'Document required' },
  { key: 'description', label: 'Description' },
  { key: 'tags', label: 'Tags' },
  { key: 'dateCreated', label: 'Date created' },
  { key: 'dateDone', label: 'Date done' },
];

/**
 * Title column is hard-locked visible — every row needs a title cell
 * as the anchor. Hiding it would leave the row with no clickable
 * surface to open the detail panel and no way to identify which row
 * is which.
 */
const ALWAYS_VISIBLE_COLUMNS: ReadonlySet<WaterfallColumnKey> = new Set([
  'title',
]);

interface CustomizeViewPanelProps {
  /** Set of column keys currently hidden in the table render. */
  hiddenColumns: Set<WaterfallColumnKey>;
  /** Toggle a single column's visibility. */
  onToggleColumn: (key: WaterfallColumnKey) => void;
  /** Close handler — invoked by X button, Escape, and backdrop click. */
  onClose: () => void;
}

type TabKey = 'fields' | 'view';

export const CustomizeViewPanel: React.FC<CustomizeViewPanelProps> = ({
  hiddenColumns,
  onToggleColumn,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('fields');
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape closes the panel.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Click outside closes the panel.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full z-40 mt-1 w-80 max-h-[500px] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl"
      role="dialog"
      aria-label="Customize view"
      data-testid="customize-view-panel"
    >
      {/* Header */}
      <div className="border-b border-slate-200 px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Settings className="h-4 w-4 text-slate-500" />
            Customize view
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close customize view"
            data-testid="customize-view-panel-close"
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {/* Tabs */}
        <div className="mt-2 flex gap-1 -mb-px">
          <button
            type="button"
            onClick={() => setActiveTab('fields')}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'fields'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            data-testid="customize-view-tab-fields"
          >
            Fields
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('view')}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'view'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            data-testid="customize-view-tab-view"
          >
            View
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 py-3">
        {activeTab === 'fields' && (
          <FieldsTab
            hiddenColumns={hiddenColumns}
            onToggleColumn={onToggleColumn}
          />
        )}
        {activeTab === 'view' && <ViewTab />}
      </div>
    </div>
  );
};

const FieldsTab: React.FC<{
  hiddenColumns: Set<WaterfallColumnKey>;
  onToggleColumn: (key: WaterfallColumnKey) => void;
}> = ({ hiddenColumns, onToggleColumn }) => {
  const visibleKeys = (Object.keys(VISIBLE_COLUMN_LABELS) as WaterfallColumnKey[]).filter(
    (k) => !hiddenColumns.has(k),
  );
  const hiddenVisibleKeys = (Object.keys(VISIBLE_COLUMN_LABELS) as WaterfallColumnKey[]).filter(
    (k) => hiddenColumns.has(k),
  );

  return (
    <div className="space-y-5">
      {/* Currently visible columns */}
      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
          Visible
        </h3>
        <ul className="space-y-1" data-testid="customize-view-visible-list">
          {visibleKeys.map((key) => {
            const locked = ALWAYS_VISIBLE_COLUMNS.has(key);
            return (
              <li key={key}>
                <label
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm ${
                    locked
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-slate-700 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked
                    disabled={locked}
                    onChange={() => !locked && onToggleColumn(key)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400 disabled:opacity-50"
                    data-testid={`customize-view-toggle-${key}`}
                  />
                  <Eye className="h-3.5 w-3.5 text-slate-400" />
                  <span className="flex-1 truncate">
                    {VISIBLE_COLUMN_LABELS[key]}
                  </span>
                  {locked && (
                    <span className="text-[10px] uppercase text-slate-400">
                      Required
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Currently hidden default columns (re-show on toggle) */}
      {hiddenVisibleKeys.length > 0 && (
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Hidden
          </h3>
          <ul className="space-y-1">
            {hiddenVisibleKeys.map((key) => (
              <li key={key}>
                <label className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => onToggleColumn(key)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400"
                    data-testid={`customize-view-toggle-${key}`}
                  />
                  <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                  <span className="flex-1 truncate">
                    {VISIBLE_COLUMN_LABELS[key]}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/*
       * Template-declared hidden pool. These columns exist in the data
       * model but don't have rich cell renderers in WaterfallTable yet.
       * Showing them here documents what the template ships with and
       * lets customers see the opt-in surface. When a future phase
       * ships the cell renderers, the "Coming soon" badge is dropped
       * and the disabled checkbox becomes interactive.
       */}
      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
          Optional fields
        </h3>
        <ul className="space-y-1">
          {HIDDEN_POOL_LABELS.map((field) => (
            <li key={field.key}>
              <label className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-slate-400 cursor-not-allowed">
                <input
                  type="checkbox"
                  checked={false}
                  disabled
                  className="h-4 w-4 rounded border-slate-300 disabled:opacity-50"
                />
                <EyeOff className="h-3.5 w-3.5 text-slate-300" />
                <span className="flex-1 truncate">{field.label}</span>
                <span className="text-[10px] uppercase text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                  Coming soon
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
          These fields exist on every task in the data model but don't
          have rich cell renderers yet. They'll become toggle-able in a
          future release.
        </p>
      </section>
    </div>
  );
};

const ViewTab: React.FC = () => {
  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        View settings
      </h3>
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
        <div className="flex items-center gap-2 mb-1">
          <Loader2 className="h-3.5 w-3.5" />
          <span className="font-medium">Coming soon</span>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed">
          Filter, group, subtask display, and saved-view persistence
          land in a future release. For now, the table renders with
          its default grouping (phases) and no filters.
        </p>
      </div>
    </div>
  );
};
