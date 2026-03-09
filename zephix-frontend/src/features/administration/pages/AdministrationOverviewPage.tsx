import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  administrationApi,
  type GovernanceDecision,
  type GovernanceHealth,
  type WorkspaceSnapshotRow,
  type GovernanceActivityEvent,
} from "@/features/administration/api/administration.api";

function formatDate(value: string): string {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString();
}

function HealthCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value ?? "—"}</p>
    </div>
  );
}

export default function AdministrationOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<GovernanceDecision[]>([]);
  const [health, setHealth] = useState<GovernanceHealth | null>(null);
  const [workspaceSnapshot, setWorkspaceSnapshot] = useState<WorkspaceSnapshotRow[]>([]);
  const [activity, setActivity] = useState<GovernanceActivityEvent[]>([]);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const [decisionData, healthData, workspaceData, activityData] = await Promise.all([
        administrationApi.listPendingDecisions({ page: 1, limit: 20 }),
        administrationApi.getGovernanceHealth(),
        administrationApi.getWorkspaceSnapshot({ page: 1, limit: 20 }),
        administrationApi.listRecentActivity(20),
      ]);
      setDecisions(decisionData.data);
      setHealth(healthData);
      setWorkspaceSnapshot(workspaceData.data);
      setActivity(activityData);
    } catch {
      setError("Failed to load administration overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      await loadOverview();
      if (!active) return;
    })();
    return () => {
      active = false;
    };
  }, []);

  const onApprove = async (decision: GovernanceDecision) => {
    setActioningId(decision.id);
    try {
      await administrationApi.approveException(decision.id);
      await loadOverview();
    } finally {
      setActioningId(null);
    }
  };

  const onReject = async (decision: GovernanceDecision) => {
    const reason = window.prompt("Provide rejection reason");
    if (!reason) return;
    setActioningId(decision.id);
    try {
      await administrationApi.rejectException(decision.id, reason);
      await loadOverview();
    } finally {
      setActioningId(null);
    }
  };

  const onRequestInfo = async (decision: GovernanceDecision) => {
    const question = window.prompt("What additional information is required?");
    if (!question) return;
    setActioningId(decision.id);
    try {
      await administrationApi.requestMoreInfo(decision.id, question);
      await loadOverview();
    } finally {
      setActioningId(null);
    }
  };

  const hasGovernanceAlerts = useMemo(() => {
    if (!health) return false;
    return (
      (health.activePolicies ?? 0) > 0 ||
      (health.capacityWarnings ?? 0) > 0 ||
      (health.budgetWarnings ?? 0) > 0 ||
      (health.hardBlocksThisWeek ?? 0) > 0
    );
  }, [health]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Administration Overview</h1>
        <p className="text-sm text-gray-600">
          Control center for governance decisions, system health, and configuration access.
        </p>
      </header>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Decisions Required</h2>
        </div>
        <div className="space-y-3 p-4">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {loading ? (
            <p className="text-sm text-gray-500">Loading decisions...</p>
          ) : decisions.length === 0 ? (
            <p className="text-sm text-gray-500">No governance decisions pending.</p>
          ) : (
            decisions.map((decision) => (
              <div key={decision.id} className="rounded-md border border-gray-200 p-3">
                <div className="grid gap-2 text-sm text-gray-700 md:grid-cols-5">
                  <p><span className="font-medium text-gray-900">Type:</span> {decision.type}</p>
                  <p><span className="font-medium text-gray-900">Workspace:</span> {decision.workspaceName}</p>
                  <p><span className="font-medium text-gray-900">Project:</span> {decision.projectName || "N/A"}</p>
                  <p><span className="font-medium text-gray-900">Reason:</span> {decision.reason}</p>
                  <p><span className="font-medium text-gray-900">Age:</span> {decision.ageHours}h</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={actioningId === decision.id}
                    onClick={() => onApprove(decision)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={actioningId === decision.id}
                    onClick={() => onReject(decision)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={actioningId === decision.id}
                    onClick={() => onRequestInfo(decision)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Request Info
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Governance Health</h2>
        {!hasGovernanceAlerts ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
            No governance alerts.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <HealthCard label="Active policies" value={health?.activePolicies ?? null} />
            <HealthCard label="Capacity warnings" value={health?.capacityWarnings ?? null} />
            <HealthCard label="Budget warnings" value={health?.budgetWarnings ?? null} />
            <HealthCard label="Hard blocks this week" value={health?.hardBlocksThisWeek ?? null} />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Workspace Snapshot</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Workspace Name</th>
                <th className="px-4 py-3">Project Count</th>
                <th className="px-4 py-3">Budget Status</th>
                <th className="px-4 py-3">Capacity Status</th>
                <th className="px-4 py-3">Open Exceptions</th>
              </tr>
            </thead>
            <tbody>
              {workspaceSnapshot.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-gray-500" colSpan={5}>
                    No workspaces available.
                  </td>
                </tr>
              ) : (
                workspaceSnapshot.map((workspace) => (
                  <tr key={workspace.id} className="border-t border-gray-200 text-sm text-gray-700">
                    <td className="px-4 py-3">{workspace.workspaceName}</td>
                    <td className="px-4 py-3">{workspace.projectCount}</td>
                    <td className="px-4 py-3">{workspace.budgetStatus}</td>
                    <td className="px-4 py-3">{workspace.capacityStatus}</td>
                    <td className="px-4 py-3">{workspace.openExceptions}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Recent Governance Activity</h2>
        </div>
        <div className="space-y-2 p-4">
          {activity.length === 0 ? (
            <p className="text-sm text-gray-500">No recent governance activity.</p>
          ) : (
            activity.map((event) => (
              <div key={event.id} className="rounded border border-gray-200 p-3 text-sm">
                <p className="font-medium text-gray-900">{event.eventType}</p>
                <p className="mt-1 text-gray-700">{event.description}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {formatDate(event.timestamp)} • {event.actorName || event.actorUserId || "System"}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Quick Actions</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/administration/workspaces" className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Create Workspace</Link>
          <Link to="/administration/users" className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Invite Admin</Link>
          <Link to="/administration/governance" className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Open Governance Policies</Link>
          <Link to="/administration/templates" className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Open Templates</Link>
          <Link to="/administration/audit-log" className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">View Audit Log</Link>
        </div>
      </section>
    </div>
  );
}
