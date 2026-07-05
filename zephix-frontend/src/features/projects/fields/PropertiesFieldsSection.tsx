import { useMemo, useState } from 'react';
import { Eye, EyeOff, Search } from 'lucide-react';

import {
  COLUMN_GROUP_LABELS,
  COLUMN_REGISTRY,
  FIELD_TAB_GROUP_ORDER,
  getWaterfallFieldsOptionalKeys,
  type ColumnGroup,
  type ProjectColumnKey,
} from '@/features/projects/columns';

import { ComingSoonBadge } from './ComingSoonBadge';

const ALWAYS_VISIBLE_COLUMNS: ReadonlySet<ProjectColumnKey> = new Set(['title']);

export type PropertiesFieldsSectionProps = {
  /** Core property columns for this view (e.g. waterfall eight-pack or agile defaults). */
  dataColumnOrder: readonly ProjectColumnKey[];
  hiddenColumns: Set<ProjectColumnKey>;
  onToggleColumn: (key: ProjectColumnKey) => void;
  governanceActive?: boolean;
  /** When false, optional-pool "More fields" section is omitted (e.g. agile Activities). */
  showOptionalPool?: boolean;
  /** Optional pool keys omitted entirely (methodology capability off). */
  excludeOptionalKeys?: ReadonlySet<ProjectColumnKey>;
};

export function PropertiesFieldsSection({
  dataColumnOrder,
  hiddenColumns,
  onToggleColumn,
  governanceActive = true,
  showOptionalPool = true,
  excludeOptionalKeys,
}: PropertiesFieldsSectionProps) {
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
    () => dataColumnOrder.filter((k) => !hiddenColumns.has(k)),
    [dataColumnOrder, hiddenColumns],
  );

  const hiddenAmongData = useMemo(
    () => dataColumnOrder.filter((k) => hiddenColumns.has(k)),
    [dataColumnOrder, hiddenColumns],
  );

  const visibleFiltered = useMemo(
    () => visibleKeys.filter((k) => matchesQuery(k)),
    [visibleKeys, matchesQuery],
  );

  const hiddenFiltered = useMemo(
    () => hiddenAmongData.filter((k) => matchesQuery(k)),
    [hiddenAmongData, matchesQuery],
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
    if (!showOptionalPool) return [];
    let opt = getWaterfallFieldsOptionalKeys();
    if (!governanceActive) {
      opt = opt.filter((k) => !COLUMN_REGISTRY[k].governanceOnly);
    }
    if (excludeOptionalKeys?.size) {
      opt = opt.filter((k) => !excludeOptionalKeys.has(k));
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
  }, [governanceActive, matchesQuery, showOptionalPool, excludeOptionalKeys]);

  const hideAllToggleable = () => {
    for (const k of dataColumnOrder) {
      if (ALWAYS_VISIBLE_COLUMNS.has(k)) continue;
      if (!hiddenColumns.has(k)) onToggleColumn(k);
    }
  };

  const showAllHidden = () => {
    for (const k of dataColumnOrder) {
      if (hiddenColumns.has(k)) onToggleColumn(k);
    }
  };

  const toggleableVisibleCount = visibleKeys.filter(
    (k) => !ALWAYS_VISIBLE_COLUMNS.has(k),
  ).length;

  return (
    <div className="space-y-4" data-testid="properties-fields-section">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search properties…"
          aria-label="Search properties"
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
                    <span className="min-w-0 flex-1 break-words">{label}</span>
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

      {hiddenAmongData.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Hidden
            </h3>
            <button
              type="button"
              onClick={showAllHidden}
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
                          <span className="min-w-0 flex-1 break-words">
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

      {showOptionalPool && (
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
                      return (
                        <li key={key}>
                          <label className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-400 dark:text-slate-500">
                            <input
                              type="checkbox"
                              checked={false}
                              disabled
                              className="h-4 w-4 rounded border-slate-300 disabled:opacity-50 dark:border-slate-600"
                              aria-label={`${def.label} (not available in table yet)`}
                            />
                            <EyeOff className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" />
                            <span className="min-w-0 flex-1 break-words">{def.label}</span>
                            <ComingSoonBadge />
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
            Optional properties ship when their table column is ready. All rows above are
            disabled until then.
          </p>
        </section>
      )}
    </div>
  );
}
