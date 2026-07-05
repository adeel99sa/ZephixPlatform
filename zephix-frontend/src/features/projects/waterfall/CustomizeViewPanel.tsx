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
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Bookmark,
  ChevronRight,
  Eye,
  FileDown,
  LayoutGrid,
  Link2,
  ListTree,
  Settings,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  WATERFALL_DATA_COLUMN_ORDER,
  type ProjectColumnKey,
  type WaterfallDataColumnKey,
} from '@/features/projects/columns';
import { PropertiesFieldsSection } from '@/features/projects/fields/PropertiesFieldsSection';

/** @deprecated Import `WaterfallDataColumnKey` from `@/features/projects/columns` */
export type WaterfallColumnKey = WaterfallDataColumnKey;

interface CustomizeViewPanelProps {
  /** Set of column keys currently hidden in the table render. */
  hiddenColumns: Set<ProjectColumnKey>;
  /** Toggle a single column's visibility. */
  onToggleColumn: (key: ProjectColumnKey) => void;
  /** Close handler — invoked by X button, Escape, and click outside. */
  onClose: () => void;
  /** Ref to the anchor button — clicks on it are excluded from click-outside. */
  anchorRef?: React.RefObject<HTMLElement | null>;
  /** Optional pool keys omitted entirely (methodology capability off). */
  excludeOptionalKeys?: ReadonlySet<ProjectColumnKey>;
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
  excludeOptionalKeys,
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
                  <PropertiesFieldsSection
                    dataColumnOrder={WATERFALL_DATA_COLUMN_ORDER}
                    hiddenColumns={hiddenColumns}
                    onToggleColumn={onToggleColumn}
                    governanceActive={governanceActive}
                    excludeOptionalKeys={excludeOptionalKeys}
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
