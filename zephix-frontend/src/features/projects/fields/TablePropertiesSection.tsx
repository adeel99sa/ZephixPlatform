export type TableColumnVisibility = {
  id: string;
  label: string;
  visible: boolean;
};

export type TablePropertiesSectionProps = {
  columns: readonly TableColumnVisibility[];
  onToggleColumn: (colId: string) => void;
};

const REQUIRED_COLUMN_IDS = new Set(['title']);

export function TablePropertiesSection({
  columns,
  onToggleColumn,
}: TablePropertiesSectionProps) {
  const visible = columns.filter((c) => c.visible);
  const hidden = columns.filter((c) => !c.visible);

  const hideAllToggleable = () => {
    for (const col of columns) {
      if (REQUIRED_COLUMN_IDS.has(col.id)) continue;
      if (col.visible) onToggleColumn(col.id);
    }
  };

  const showAllHidden = () => {
    for (const col of columns) {
      if (!col.visible) onToggleColumn(col.id);
    }
  };

  const toggleableVisibleCount = visible.filter((c) => !REQUIRED_COLUMN_IDS.has(c.id)).length;

  return (
    <div className="space-y-4" data-testid="table-properties-section">
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
        <ul className="space-y-1" data-testid="table-properties-visible-list">
          {visible.map((col) => {
            const locked = REQUIRED_COLUMN_IDS.has(col.id);
            return (
              <li key={col.id}>
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
                    onChange={() => !locked && onToggleColumn(col.id)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400 disabled:opacity-50 dark:border-slate-600"
                    data-testid={`table-properties-toggle-${col.id}`}
                  />
                  <span className="min-w-0 flex-1 break-words">{col.label}</span>
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
      </section>

      {hidden.length > 0 && (
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
          <ul className="space-y-1" data-testid="table-properties-hidden-list">
            {hidden.map((col) => (
              <li key={col.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/80">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => onToggleColumn(col.id)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400 dark:border-slate-600"
                    data-testid={`table-properties-toggle-${col.id}`}
                  />
                  <span className="min-w-0 flex-1 break-words">{col.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
