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
 *   - Three sections (ClickUp-style): View options | Configuration | View settings
 *   - Configuration includes an expandable **Fields** block (same content as the
 *     former Fields tab): visible / hidden / more fields, search, registry-driven.
 *   - Other configuration rows (subtasks, export) are placeholders until those surfaces ship.
 *     Filter / Group / Sort live in the project toolbar, not in this panel.
 *   - View options holds lightweight display toggles (placeholders).
 *   - View settings: copy link to current URL, saved views placeholder.
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
 *   - Future expansion (more configuration rows, custom fields, etc.) keeps the
 *     panel growing without affecting the table
 */
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Bookmark,
  ChevronRight,
  Eye,
  EyeOff,
  FileDown,
  LayoutGrid,
  Link2,
  ListTree,
  Search,
  Settings,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  COLUMN_GROUP_LABELS,
  COLUMN_REGISTRY,
  FIELD_TAB_GROUP_ORDER,
  getWaterfallFieldsOptionalKeys,
  shouldShowFieldsComingSoonBadge,
  WATERFALL_DATA_COLUMN_ORDER,
  type ColumnGroup,
  type ProjectColumnKey,
  type WaterfallDataColumnKey,
} from '@/features/projects/columns';

/** @deprecated Import `WaterfallDataColumnKey` from `@/features/projects/columns` */
export type WaterfallColumnKey = WaterfallDataColumnKey;

/**
 * Title column is hard-locked visible — every row needs a title cell
 * as the anchor. Hiding it would leave the row with no clickable
 * surface to open the detail panel and no way to identify which row
 * is which.
 */
const ALWAYS_VISIBLE_COLUMNS: ReadonlySet<WaterfallDataColumnKey> = new Set([
  'title',
]);

interface CustomizeViewPanelProps {
  /** Set of column keys currently hidden in the table render. */
  hiddenColumns: Set<ProjectColumnKey>;
  /** Toggle a single column's visibility. */
  onToggleColumn: (key: ProjectColumnKey) => void;
  /** Close handler — invoked by X button, Escape, and click outside. */
  onClose: () => void;
  /** Ref to the anchor button — clicks on it are excluded from click-outside. */
  anchorRef?: React.RefObject<HTMLElement | null>;
  /**
   * When false, governance-only optional rows (approval / document required) are hidden.
   * Default true until project governance context is wired.
   */
  governanceActive?: boolean;
  /**
   * Incremented by the parent when the user opens Fields from the + header while
   * the panel may already be open — expands Fields and scrolls it into view.
   */
  fieldsFocusKey?: number;
  /** Refs whose elements should not count as “outside” for backdrop close. */
  extraExcludeRefs?: ReadonlyArray<React.RefObject<HTMLElement | null>>;
}

const PANEL_WIDTH_PX = 320;
const VIEWPORT_MARGIN = 8;

export const CustomizeViewPanel: React.FC<CustomizeViewPanelProps> = ({
  hiddenColumns,
  onToggleColumn,
  onClose,
  anchorRef,
  governanceActive = true,
  fieldsFocusKey = 0,
  extraExcludeRefs,
}) => {
  const [fieldsExpanded, setFieldsExpanded] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const fieldsSectionRef = useRef<HTMLDivElement>(null);
  const [fixedStyle, setFixedStyle] = useState<React.CSSProperties | null>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef?.current;
    if (!anchor) {
      setFixedStyle(null);
      return;
    }

    const updatePosition = () => {
      const el = anchorRef?.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const left = Math.min(
        Math.max(VIEWPORT_MARGIN, rect.right - PANEL_WIDTH_PX),
        window.innerWidth - PANEL_WIDTH_PX - VIEWPORT_MARGIN,
      );
      setFixedStyle({
        position: 'fixed',
        top: rect.bottom + VIEWPORT_MARGIN,
        left,
        width: PANEL_WIDTH_PX,
        maxHeight: '70vh',
        zIndex: 50,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef]);

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

  // Click outside closes the panel (excludes anchor and optional triggers, e.g. + header).
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideExtra = extraExcludeRefs?.some((r) => r.current?.contains(target));
      const insideAnchor = anchorRef?.current?.contains(target);
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        !insideAnchor &&
        !insideExtra
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef, extraExcludeRefs]);

  useEffect(() => {
    if (!fieldsFocusKey) return;
    setFieldsExpanded(true);
    const id = window.requestAnimationFrame(() => {
      fieldsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [fieldsFocusKey]);

  const panelClasses =
    'overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950/40';

  const panelInner = (
    <div
      ref={panelRef}
      className={fixedStyle ? panelClasses : `absolute right-0 top-full z-40 mt-1 w-80 max-h-[500px] ${panelClasses}`}
      style={fixedStyle ?? undefined}
      role="dialog"
      aria-label="Customize view"
      data-testid="customize-view-panel"
    >
      {/* Header */}
      <div className="border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <Settings className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            Customize view
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close customize view"
            data-testid="customize-view-panel-close"
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-5 px-4 py-3">
        {/* View options */}
        <section aria-labelledby="customize-view-options-heading">
          <h2
            id="customize-view-options-heading"
            className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
          >
            View options
          </h2>
          <div className="mt-2 space-y-1">
            <ComingSoonConfigRow
              icon={LayoutGrid}
              label="Compact density"
              data-testid="customize-view-option-compact"
            />
            <ComingSoonConfigRow
              icon={SlidersHorizontal}
              label="Highlight overdue tasks"
              data-testid="customize-view-option-overdue"
            />
          </div>
        </section>

        {/* Configuration */}
        <section aria-labelledby="customize-configuration-heading">
          <h2
            id="customize-configuration-heading"
            className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
          >
            Configuration
          </h2>
          <div className="mt-2 space-y-1">
            <div ref={fieldsSectionRef} className="rounded-md border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setFieldsExpanded((v) => !v)}
                aria-expanded={fieldsExpanded}
                data-testid="customize-view-configuration-fields-toggle"
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800/80"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Eye className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                  <span className="truncate">Fields</span>
                </span>
                <ChevronRight
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform dark:text-slate-500 ${
                    fieldsExpanded ? 'rotate-90' : ''
                  }`}
                  aria-hidden
                />
              </button>
              {fieldsExpanded && (
                <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-700">
                  <FieldsTab
                    hiddenColumns={hiddenColumns}
                    onToggleColumn={onToggleColumn}
                    governanceActive={governanceActive}
                  />
                </div>
              )}
            </div>
            <ComingSoonConfigRow
              icon={ListTree}
              label="Subtasks"
              data-testid="customize-view-config-subtasks"
            />
            <ComingSoonConfigRow icon={FileDown} label="Export" data-testid="customize-view-config-export" />
          </div>
        </section>

        {/* View settings */}
        <section aria-labelledby="customize-view-settings-heading">
          <h2
            id="customize-view-settings-heading"
            className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
          >
            View settings
          </h2>
          <div className="mt-2 space-y-2">
            <button
              type="button"
              onClick={async () => {
                const url = window.location.href;
                try {
                  await navigator.clipboard.writeText(url);
                  toast.success('Link copied');
                } catch {
                  toast.error('Could not copy link');
                }
              }}
              className="flex w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              data-testid="customize-view-copy-link"
            >
              <Link2 className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
              Copy link to this view
            </button>
            <ComingSoonConfigRow
              icon={Bookmark}
              label="Saved views & defaults"
              data-testid="customize-view-saved-views"
            />
          </div>
        </section>
      </div>
    </div>
  );

  if (fixedStyle) {
    return createPortal(panelInner, document.body);
  }

  return panelInner;
};

function ComingSoonConfigRow({
  icon: Icon,
  label,
  className,
  ...rest
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={`flex items-center justify-between gap-2 rounded-md border border-transparent px-2 py-2 text-sm text-slate-600 dark:text-slate-300 ${className ?? ''}`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200">
        Coming soon
      </span>
    </div>
  );
}

const FieldsTab: React.FC<{
  hiddenColumns: Set<ProjectColumnKey>;
  onToggleColumn: (key: ProjectColumnKey) => void;
  governanceActive: boolean;
}> = ({ hiddenColumns, onToggleColumn, governanceActive }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const matchesQuery = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (key: ProjectColumnKey) => {
      if (!q) return true;
      const def = COLUMN_REGISTRY[key];
      return (
        def.label.toLowerCase().includes(q) || String(key).toLowerCase().includes(q)
      );
    };
  }, [searchQuery]);

  const visibleKeys = useMemo(
    () => [...WATERFALL_DATA_COLUMN_ORDER].filter((k) => !hiddenColumns.has(k)),
    [hiddenColumns],
  );

  const hiddenAmongWaterfall = useMemo(
    () => [...WATERFALL_DATA_COLUMN_ORDER].filter((k) => hiddenColumns.has(k)),
    [hiddenColumns],
  );

  const visibleFiltered = useMemo(
    () => visibleKeys.filter((k) => matchesQuery(k)),
    [visibleKeys, matchesQuery],
  );

  const hiddenFiltered = useMemo(
    () => hiddenAmongWaterfall.filter((k) => matchesQuery(k)),
    [hiddenAmongWaterfall, matchesQuery],
  );

  const hiddenByGroup = useMemo(() => {
    const map = new Map<ColumnGroup, ProjectColumnKey[]>();
    for (const key of hiddenFiltered) {
      const g = COLUMN_REGISTRY[key].group;
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(key);
    }
    return FIELD_TAB_GROUP_ORDER.filter((g) => (map.get(g)?.length ?? 0) > 0).map(
      (g) => ({ group: g, keys: map.get(g)! }),
    );
  }, [hiddenFiltered]);

  const optionalByGroup = useMemo(() => {
    let opt = getWaterfallFieldsOptionalKeys();
    if (!governanceActive) {
      opt = opt.filter((k) => !COLUMN_REGISTRY[k].governanceOnly);
    }
    opt = opt.filter((k) => matchesQuery(k));
    const map = new Map<ColumnGroup, ProjectColumnKey[]>();
    for (const key of opt) {
      const g = COLUMN_REGISTRY[key].group;
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(key);
    }
    return FIELD_TAB_GROUP_ORDER.filter((g) => (map.get(g)?.length ?? 0) > 0).map(
      (g) => ({ group: g, keys: map.get(g)! }),
    );
  }, [governanceActive, matchesQuery]);

  const hideAllToggleable = () => {
    for (const k of WATERFALL_DATA_COLUMN_ORDER) {
      if (ALWAYS_VISIBLE_COLUMNS.has(k)) continue;
      if (!hiddenColumns.has(k)) onToggleColumn(k);
    }
  };

  const showAllWaterfallHidden = () => {
    for (const k of WATERFALL_DATA_COLUMN_ORDER) {
      if (hiddenColumns.has(k)) onToggleColumn(k);
    }
  };

  const toggleableVisibleCount = visibleKeys.filter(
    (k) => !ALWAYS_VISIBLE_COLUMNS.has(k),
  ).length;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search fields…"
          aria-label="Search fields"
          data-testid="customize-view-fields-search"
          className="w-full rounded-md border border-slate-200 bg-white py-2 pl-8 pr-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Visible
          </h3>
          {toggleableVisibleCount > 0 && (
            <button
              type="button"
              onClick={hideAllToggleable}
              className="text-[11px] font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Hide all
            </button>
          )}
        </div>
        {visibleFiltered.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">No matching visible columns.</p>
        ) : (
          <ul className="space-y-1" data-testid="customize-view-visible-list">
            {visibleFiltered.map((key) => {
              const locked = ALWAYS_VISIBLE_COLUMNS.has(key);
              const label = COLUMN_REGISTRY[key].label;
              return (
                <li key={key}>
                  <label
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                      locked
                        ? 'cursor-not-allowed text-slate-400 dark:text-slate-500'
                        : 'cursor-pointer text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked
                      disabled={locked}
                      onChange={() => !locked && onToggleColumn(key)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400 disabled:opacity-50 dark:border-slate-600"
                      data-testid={`customize-view-toggle-${key}`}
                    />
                    <Eye className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {locked && (
                      <span className="shrink-0 text-[10px] uppercase text-slate-400 dark:text-slate-500">
                        Required
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {hiddenAmongWaterfall.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Hidden
            </h3>
            <button
              type="button"
              onClick={showAllWaterfallHidden}
              className="text-[11px] font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Show all
            </button>
          </div>
          {hiddenFiltered.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              No matches in hidden columns — clear search to see all.
            </p>
          ) : (
            <div className="space-y-4">
              {hiddenByGroup.map(({ group, keys }) => (
                <div key={group}>
                  <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {COLUMN_GROUP_LABELS[group]}
                  </h4>
                  <ul className="space-y-1">
                    {keys.map((key) => (
                      <li key={key}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/80">
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={() => onToggleColumn(key)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400 dark:border-slate-600"
                            data-testid={`customize-view-toggle-${key}`}
                          />
                          <EyeOff className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                          <span className="min-w-0 flex-1 truncate">
                            {COLUMN_REGISTRY[key].label}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          More fields
        </h3>
        {optionalByGroup.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {searchQuery.trim()
              ? governanceActive
                ? 'No fields match your search.'
                : 'No fields match your search (governance-only columns are hidden).'
              : governanceActive
                ? 'No optional fields are listed for this view.'
                : 'No optional fields (governance-only columns are hidden).'}
          </p>
        ) : (
          <div className="space-y-4">
            {optionalByGroup.map(({ group, keys }) => (
              <div key={group}>
                <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {COLUMN_GROUP_LABELS[group]}
                </h4>
                <ul className="space-y-1">
                  {keys.map((key) => {
                    const def = COLUMN_REGISTRY[key];
                    const showBadge = shouldShowFieldsComingSoonBadge(def);
                    return (
                      <li key={key}>
                        <label
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                            showBadge
                              ? 'cursor-not-allowed text-slate-400 dark:text-slate-500'
                              : 'cursor-not-allowed text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={false}
                            disabled
                            className="h-4 w-4 rounded border-slate-300 disabled:opacity-50 dark:border-slate-600"
                            aria-label={`${def.label} (not available in table yet)`}
                          />
                          <EyeOff
                            className={`h-3.5 w-3.5 shrink-0 ${
                              showBadge ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500'
                            }`}
                          />
                          <span className="min-w-0 flex-1 truncate">{def.label}</span>
                          {showBadge && (
                            <span className="shrink-0 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200">
                              Coming soon
                            </span>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
          More fields are defined on tasks in the data model. When a column ships in the table,
          its checkbox becomes active here. Fields without the badge are on the roadmap first.
        </p>
      </section>
    </div>
  );
};

/** Opens from the table header “+” only — same Fields tab as inside Customize View, no view options. */
export interface StandaloneFieldsPanelProps {
  hiddenColumns: Set<ProjectColumnKey>;
  onToggleColumn: (key: ProjectColumnKey) => void;
  governanceActive?: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  /** e.g. gear button — excluded so opening Customize View can run without this panel eating the click. */
  extraExcludeRefs?: ReadonlyArray<React.RefObject<HTMLElement | null>>;
}

export const StandaloneFieldsPanel: React.FC<StandaloneFieldsPanelProps> = ({
  hiddenColumns,
  onToggleColumn,
  governanceActive = true,
  onClose,
  anchorRef,
  extraExcludeRefs,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [fixedStyle, setFixedStyle] = useState<React.CSSProperties | null>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef?.current;
    if (!anchor) {
      setFixedStyle(null);
      return;
    }

    const updatePosition = () => {
      const el = anchorRef?.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const left = Math.min(
        Math.max(VIEWPORT_MARGIN, rect.right - PANEL_WIDTH_PX),
        window.innerWidth - PANEL_WIDTH_PX - VIEWPORT_MARGIN,
      );
      setFixedStyle({
        position: 'fixed',
        top: rect.bottom + VIEWPORT_MARGIN,
        left,
        width: PANEL_WIDTH_PX,
        maxHeight: '70vh',
        zIndex: 55,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef]);

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideExtra = extraExcludeRefs?.some((r) => r.current?.contains(target));
      const insideAnchor = anchorRef?.current?.contains(target);
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        !insideAnchor &&
        !insideExtra
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef, extraExcludeRefs]);

  const panelClasses =
    'overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950/40';

  const panelInner = (
    <div
      ref={panelRef}
      className={
        fixedStyle
          ? panelClasses
          : `absolute right-0 top-full z-[55] mt-1 w-80 max-h-[70vh] ${panelClasses}`
      }
      style={fixedStyle ?? undefined}
      role="dialog"
      aria-label="Fields"
      data-testid="standalone-fields-panel"
    >
      <div className="border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <Eye className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            Fields
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close fields panel"
            data-testid="standalone-fields-panel-close"
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="px-4 py-3">
        <FieldsTab
          hiddenColumns={hiddenColumns}
          onToggleColumn={onToggleColumn}
          governanceActive={governanceActive}
        />
      </div>
    </div>
  );

  if (fixedStyle) {
    return createPortal(panelInner, document.body);
  }

  return panelInner;
};
