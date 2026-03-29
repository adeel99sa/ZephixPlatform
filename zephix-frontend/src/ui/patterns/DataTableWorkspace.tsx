import { useMemo, useState } from "react";

export type DataColumn<T> = {
  key: keyof T & string;
  title: string;
  render?: (row: T) => React.ReactNode;
};

type DataTableWorkspaceProps<T extends Record<string, unknown>> = {
  title: string;
  rows: T[];
  columns: DataColumn<T>[];
  pageSize?: number;
};

export function DataTableWorkspace<T extends Record<string, unknown>>({
  title,
  rows,
  columns,
  pageSize = 20,
}: DataTableWorkspaceProps<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState(columns[0]?.key || "");
  const [page, setPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columns.map((column) => column.key),
  );
  const [savedViews, setSavedViews] = useState<
    Array<{ id: string; name: string; query: string; sortKey: string; visibleColumns: string[] }>
  >([]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const baseRows = normalizedQuery
      ? rows.filter((row) =>
          Object.values(row).some((value) =>
            String(value).toLowerCase().includes(normalizedQuery),
          ),
        )
      : rows;
    return [...baseRows].sort((a, b) =>
      String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? "")),
    );
  }, [rows, query, sortKey]);

  const start = (page - 1) * pageSize;
  const pageRows = filteredRows.slice(start, start + pageSize);
  const maxPage = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const renderColumns = columns.filter((column) => visibleColumns.includes(column.key));

  function toggleColumn(columnKey: string) {
    setVisibleColumns((prev) =>
      prev.includes(columnKey)
        ? prev.filter((key) => key !== columnKey)
        : [...prev, columnKey],
    );
  }

  function saveCurrentView() {
    const id = crypto.randomUUID();
    setSavedViews((prev) => [
      ...prev,
      {
        id,
        name: `View ${prev.length + 1}`,
        query,
        sortKey,
        visibleColumns,
      },
    ]);
  }

  function applySavedView(viewId: string) {
    const view = savedViews.find((item) => item.id === viewId);
    if (!view) return;
    setQuery(view.query);
    setSortKey(view.sortKey);
    setVisibleColumns(view.visibleColumns);
    setPage(1);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[var(--zs-shadow-card)]">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Filter..."
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {columns.map((column) => (
              <option key={column.key} value={column.key}>
                Sort by {column.title}
              </option>
            ))}
          </select>
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-700">
              Columns
            </summary>
            <div className="absolute right-0 z-10 mt-1 min-w-44 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
              {columns.map((column) => (
                <label key={column.key} className="flex items-center gap-2 py-1 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(column.key)}
                    onChange={() => toggleColumn(column.key)}
                  />
                  <span>{column.title}</span>
                </label>
              ))}
            </div>
          </details>
          <button
            onClick={saveCurrentView}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-700"
          >
            Save view
          </button>
        </div>
      </header>
      {savedViews.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {savedViews.map((view) => (
            <button
              key={view.id}
              onClick={() => applySavedView(view.id)}
              className="rounded-full border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              {view.name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="zs-table">
          <thead>
            <tr>
              {renderColumns.map((column) => (
                <th key={column.key}>
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, index) => (
              <tr key={index}>
                {renderColumns.map((column) => (
                  <td key={column.key}>
                    {column.render ? column.render(row) : String(row[column.key] ?? "-")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>
          {renderColumns.length} / {columns.length} columns visible
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border border-slate-300 px-2 py-1"
          >
            Prev
          </button>
          <span>
            Page {page} / {maxPage}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
            className="rounded border border-slate-300 px-2 py-1"
          >
            Next
          </button>
        </div>
      </footer>
    </section>
  );
}

