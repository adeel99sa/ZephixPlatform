import { useEffect, useMemo, useState } from "react";
import {
  administrationApi,
  type AdminAuditEvent,
} from "@/features/administration/api/administration.api";

function formatDate(value?: string): string {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString();
}

export default function AdministrationAuditLogPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<AdminAuditEvent[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await administrationApi.listAuditEvents({ page: 1, limit: 50 });
        if (active) setEvents(result.data);
      } catch {
        if (active) {
          setError("Failed to load audit events.");
          setEvents([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return events;
    const normalized = query.toLowerCase();
    return events.filter((event) => {
      const action = String(event.action || "").toLowerCase();
      const actor = String(event.actorUserId || "").toLowerCase();
      const description = String(event.description || "").toLowerCase();
      return (
        action.includes(normalized) ||
        actor.includes(normalized) ||
        description.includes(normalized)
      );
    });
  }, [events, query]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Audit Trail</h1>
        <p className="mt-1 text-sm text-gray-600">
          Track who did what, when, across your organization.
        </p>
      </header>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <label htmlFor="audit-filter" className="block text-xs font-medium uppercase tracking-wide text-gray-500">
          Filter
        </label>
        <input
          id="audit-filter"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by actor, event type, or description"
          className="mt-2 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-gray-500"
        />
      </section>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Event Type</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>
                    Loading audit events...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>
                    No audit events available.
                  </td>
                </tr>
              ) : (
                filtered.map((event) => (
                  <tr key={event.id} className="border-t border-gray-200 text-sm text-gray-700">
                    <td className="px-4 py-3">{formatDate(event.createdAt)}</td>
                    <td className="px-4 py-3">{event.actorUserId || "System"}</td>
                    <td className="px-4 py-3">{event.action || "Unknown event"}</td>
                    <td className="px-4 py-3">{event.description || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
