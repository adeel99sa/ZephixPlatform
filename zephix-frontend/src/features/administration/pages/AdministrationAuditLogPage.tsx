import { useCallback, useEffect, useMemo, useState } from "react";

import {
  administrationApi,
  type AdminAuditEvent,
} from "@/features/administration/api/administration.api";

function formatAbsolute(value?: string): string {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString();
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Unknown";
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? "" : "s"} ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  const yr = Math.floor(mo / 12);
  return `${yr} year${yr === 1 ? "" : "s"} ago`;
}

function initialsFromName(name: string, fallbackId: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (fallbackId || "?").replace(/-/g, "").slice(0, 2).toUpperCase() || "?";
}

function eventCategoryBadgeClass(category: string): string {
  const c = category.toLowerCase();
  if (c === "auth") return "bg-sky-100 text-sky-800";
  if (c === "task") return "bg-emerald-100 text-emerald-800";
  if (c === "project") return "bg-indigo-100 text-indigo-800";
  if (c === "governance") return "bg-violet-100 text-violet-800";
  if (c === "admin") return "bg-slate-200 text-slate-800";
  return "bg-slate-100 text-slate-600";
}

function inferEventCategory(entityType: string): string {
  const et = entityType.toLowerCase();
  if (et === "user" || et === "email_verification") return "Auth";
  if (et === "work_task" || et === "board_move") return "Task";
  if (et === "project" || et === "portfolio") return "Project";
  if (
    [
      "work_risk",
      "entitlement",
      "billing_plan",
      "scenario_plan",
      "scenario_action",
      "scenario_result",
      "baseline",
      "capacity_calendar",
    ].includes(et)
  ) {
    return "Governance";
  }
  if (["organization", "workspace", "webhook", "attachment", "doc"].includes(et)) {
    return "Admin";
  }
  return "Other";
}

export default function AdministrationAuditLogPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<AdminAuditEvent[]>([]);
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number; totalPages?: number } | null>(
    null,
  );
  const [dateRange, setDateRange] = useState<string>("30d");
  const [eventCategory, setEventCategory] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await administrationApi.listAuditEvents({
        page,
        limit: 25,
        dateRange,
        eventCategory: eventCategory === "all" ? undefined : eventCategory.toLowerCase(),
        search: searchApplied.trim() || undefined,
      });
      setEvents(result.data);
      setMeta(result.meta);
    } catch {
      setError("Failed to load audit events.");
      setEvents([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [page, dateRange, eventCategory, searchApplied]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = useMemo(() => {
    if (!meta) return 1;
    if (meta.totalPages && meta.totalPages > 0) return meta.totalPages;
    const lim = meta.limit || 25;
    return Math.max(1, Math.ceil((meta.total || 0) / lim));
  }, [meta]);

  const showingFrom = meta && meta.total > 0 ? (meta.page - 1) * meta.limit + 1 : 0;
  const showingTo =
    meta && meta.total > 0 ? Math.min(meta.page * meta.limit, meta.total) : 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Audit Trail</h1>
        <p className="mt-1 text-sm text-gray-600">
          Track who did what, when, across your organization.
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
            Date range
          </label>
          <select
            value={dateRange}
            onChange={(e) => {
              setPage(1);
              setDateRange(e.target.value);
            }}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 md:max-w-xs"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
            Event type
          </label>
          <select
            value={eventCategory}
            onChange={(e) => {
              setPage(1);
              setEventCategory(e.target.value);
            }}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 md:max-w-xs"
          >
            <option value="all">All</option>
            <option value="auth">Auth</option>
            <option value="task">Task</option>
            <option value="project">Project</option>
            <option value="governance">Governance</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="min-w-0 flex-[2]">
          <label
            htmlFor="audit-search"
            className="block text-xs font-medium uppercase tracking-wide text-gray-500"
          >
            Search
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="audit-search"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  setSearchApplied(searchInput);
                }
              }}
              placeholder="Description, action, or entity…"
              className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-sm text-gray-800"
            />
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setSearchApplied(searchInput);
              }}
              className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900"
            >
              Apply
            </button>
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Event type</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>
                    Loading audit events…
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>
                    No audit events match your filters.
                  </td>
                </tr>
              ) : (
                events.map((event) => {
                  const actorLabel =
                    (event.actorName && String(event.actorName).trim()) ||
                    (event.actorUserId ? String(event.actorUserId) : "System");
                  const cat = inferEventCategory(event.entityType || "");
                  return (
                    <tr key={event.id} className="border-t border-gray-200 text-sm text-gray-700">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span title={formatAbsolute(event.createdAt)} className="cursor-default">
                          {formatRelative(event.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white"
                            aria-hidden
                          >
                            {initialsFromName(actorLabel, event.actorUserId || "")}
                          </div>
                          <span className="font-medium text-gray-900">{actorLabel}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${eventCategoryBadgeClass(cat)}`}
                        >
                          {cat}
                        </span>
                        <div className="mt-0.5 text-[11px] text-gray-400">
                          {event.action}
                          {event.entityType ? ` · ${event.entityType}` : ""}
                        </div>
                      </td>
                      <td className="max-w-md px-4 py-3 text-gray-800">
                        {event.description}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {meta && meta.total > 0 ? (
          <div className="flex flex-col items-start justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-600 sm:flex-row sm:items-center">
            <p>
              Showing {showingFrom}-{showingTo} of {meta.total}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
