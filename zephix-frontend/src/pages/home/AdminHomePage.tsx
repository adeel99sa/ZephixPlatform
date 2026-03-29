import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTemplateCenterModalStore } from "@/state/templateCenterModal.store";
import { administrationApi, type GovernanceActivityEvent } from "@/features/administration/api/administration.api";

type AdminHomeData = {
  pendingDecisions: number;
  workspaceCount: number;
  activity: GovernanceActivityEvent[];
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString();
}

export default function AdminHomePage() {
  const openTemplateCenter = useTemplateCenterModalStore(
    (s) => s.openTemplateCenter,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminHomeData>({
    pendingDecisions: 0,
    workspaceCount: 0,
    activity: [],
  });

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [decisions, snapshot, activity] = await Promise.all([
          administrationApi.listPendingDecisions({ page: 1, limit: 20 }),
          administrationApi.getWorkspaceSnapshot({ page: 1, limit: 20 }),
          administrationApi.listRecentActivity(8),
        ]);
        if (!active) return;
        setData({
          pendingDecisions: decisions.meta?.total ?? decisions.data.length,
          workspaceCount: snapshot.meta?.total ?? snapshot.data.length,
          activity,
        });
      } catch {
        if (!active) return;
        setError("Failed to load admin home data.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Home</h1>
        <p className="text-sm text-gray-600">
          Central entrypoint for priority actions, recent activity, and administration controls.
        </p>
      </header>

      {error ? <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Pending decisions</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{loading ? "..." : data.pendingDecisions}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Active workspaces</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{loading ? "..." : data.workspaceCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Dashboard customization</p>
          <p className="mt-2 text-sm text-gray-700">Configurable cards can be enabled in a follow-up iteration.</p>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Quick actions</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/administration" className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Administration overview</Link>
          <Link to="/administration/users" className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Invite admin</Link>
          <Link to="/work" className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Open work</Link>
          <button
            type="button"
            onClick={() => openTemplateCenter(undefined)}
            className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Open templates
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Recent activity</h2>
        <div className="mt-3 space-y-2">
          {loading ? (
            <p className="text-sm text-gray-500">Loading activity...</p>
          ) : data.activity.length === 0 ? (
            <p className="text-sm text-gray-500">No recent activity.</p>
          ) : (
            data.activity.map((event) => (
              <div key={event.id} className="rounded border border-gray-200 p-3 text-sm">
                <p className="font-medium text-gray-900">{event.eventType}</p>
                <p className="mt-1 text-gray-700">{event.description}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {formatDate(event.timestamp)} - {event.actorName || event.actorUserId || "System"}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
