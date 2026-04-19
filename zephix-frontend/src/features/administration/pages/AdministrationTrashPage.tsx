import { useDeferredValue, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ClipboardList,
  CornerDownRight,
  Folder,
  ListFilter,
  MoreHorizontal,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { administrationApi, type AdministrationTrashItem } from "../api/administration.api";

function ItemTypeIcon({ displayType }: { displayType: string }) {
  const t = displayType.toLowerCase();
  const className = "h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500";
  if (t === "workspace") return <Building2 className={className} aria-hidden />;
  if (t === "project") return <Folder className={className} aria-hidden />;
  if (t === "subtask") return <CornerDownRight className={className} aria-hidden />;
  if (t === "task") return <ClipboardList className={className} aria-hidden />;
  return <ClipboardList className={className} aria-hidden />;
}

function formatDeletedDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initialsFromName(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]!}${parts[parts.length - 1]![0]!}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function AdministrationTrashPage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-trash", page, typeFilter, deferredSearch],
    queryFn: () =>
      administrationApi.getTrashItems({
        page,
        limit: 25,
        type: typeFilter,
        search: deferredSearch.trim() || undefined,
      }),
  });

  const items = data?.data ?? [];
  const meta = data?.meta;

  const restoreMutation = useMutation({
    mutationFn: ({ kind, id }: { kind: string; id: string }) =>
      administrationApi.restoreTrashItem(kind, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-trash"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ kind, id }: { kind: string; id: string }) =>
      administrationApi.permanentlyDeleteTrashItem(kind, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-trash"] }),
  });

  const clearAllMutation = useMutation({
    mutationFn: () => administrationApi.clearAllTrash(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-trash"] }),
  });

  const handleRestore = (item: AdministrationTrashItem) => {
    if (confirm(`Restore "${item.name}"?`)) {
      restoreMutation.mutate({ kind: item.type, id: item.id });
    }
  };

  const handleDeleteForever = (item: AdministrationTrashItem) => {
    if (confirm(`Permanently delete "${item.name}"? This cannot be undone.`)) {
      deleteMutation.mutate({ kind: item.type, id: item.id });
    }
  };

  const handleClearAll = () => {
    if (confirm("Permanently delete ALL items in trash? This cannot be undone.")) {
      clearAllMutation.mutate();
    }
  };

  const displayLabel = (item: AdministrationTrashItem) =>
    item.displayType ||
    (item.type === "task" ? "Task" : item.type === "project" ? "Project" : "Workspace");

  return (
    <div className="px-1">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trash</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Items shown below will be automatically deleted forever after 30 days.
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            disabled={clearAllMutation.isPending}
            className="shrink-0 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            Clear all Trash
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search deleted items..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <ListFilter className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="min-w-[10rem] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="all">All types</option>
            <option value="task">Tasks</option>
            <option value="project">Projects</option>
            <option value="workspace">Workspaces</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-400">Loading...</div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center">
          <Trash2 className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">Trash is empty</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
            Deleted projects, tasks, and other items will appear here. Items are automatically removed after 30 days.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Location</th>
                  <th className="pb-3 pr-4">Deleted On</th>
                  <th className="pb-3 pr-4">Deleted By</th>
                  <th className="w-10 pb-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const rowKey = `${item.type}-${item.id}`;
                  const open = menuOpenId === rowKey;
                  return (
                    <tr
                      key={rowKey}
                      className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex min-w-0 items-center gap-2">
                          <ItemTypeIcon displayType={displayLabel(item)} />
                          <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-500 dark:text-gray-400">
                        {displayLabel(item)}
                      </td>
                      <td className="max-w-[240px] truncate py-3 pr-4 text-sm text-gray-500 dark:text-gray-400">
                        {item.location || "—"}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDeletedDate(item.deletedAt)}
                      </td>
                      <td className="py-3 pr-4">
                        {item.deletedByName ? (
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[10px] font-medium text-white"
                            title={item.deletedByName}
                          >
                            {initialsFromName(item.deletedByName)}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="relative flex justify-end" ref={open ? menuRef : undefined}>
                          <button
                            type="button"
                            aria-label="Row actions"
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId(open ? null : rowKey);
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {open && (
                            <div className="absolute right-0 top-8 z-20 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                                onClick={() => {
                                  setMenuOpenId(null);
                                  handleRestore(item);
                                }}
                              >
                                <RotateCcw className="h-4 w-4" />
                                Restore
                              </button>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => {
                                  setMenuOpenId(null);
                                  handleDeleteForever(item);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete forever
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages != null && meta.totalPages > 1 && (
            <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(page - 1) * (meta.limit ?? 25) + 1}-
                {Math.min(page * (meta.limit ?? 25), meta.total)} of {meta.total}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded border px-3 py-1 text-sm disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= (meta.totalPages ?? 1)}
                  className="rounded border px-3 py-1 text-sm disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AdministrationTrashPage;
