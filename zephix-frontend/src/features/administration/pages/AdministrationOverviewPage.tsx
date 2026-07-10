import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  administrationApi,
  type WorkspaceSnapshotRow,
  type GovernanceActivityEvent,
} from "@/features/administration/api/administration.api";
import { InviteMembersDialog } from "../components/InviteMembersDialog";
import { useAdminWorkspacesModalStore } from "@/stores/adminWorkspacesModalStore";
import { RbacMigrationSummaryTile } from "@/features/administration/components/RbacMigrationSummaryTile";

function formatDate(value: string): string {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString();
}

export default function AdministrationOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [workspaceSnapshot, setWorkspaceSnapshot] = useState<WorkspaceSnapshotRow[]>([]);
  const [activity, setActivity] = useState<GovernanceActivityEvent[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);

  const loadOverview = async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      administrationApi.getWorkspaceSnapshot({ page: 1, limit: 20 }),
      administrationApi.listRecentActivity(20),
    ]);
    if (results[0].status === "fulfilled") setWorkspaceSnapshot(results[0].value.data);
    if (results[1].status === "fulfilled") setActivity(results[1].value);
    setLoading(false);
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

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Administration Overview</h1>
        <p className="text-sm text-gray-600">
          Workspace snapshot, recent governance activity, and quick configuration access.
        </p>
      </header>

      <RbacMigrationSummaryTile />

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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>
                    Loading workspace snapshot...
                  </td>
                </tr>
              ) : workspaceSnapshot.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-gray-500" colSpan={4}>
                    No workspaces available.
                  </td>
                </tr>
              ) : (
                workspaceSnapshot.map((workspace) => (
                  <tr key={workspace.workspaceId} className="border-t border-gray-200 text-sm text-gray-700">
                    <td className="px-4 py-3">{workspace.workspaceName}</td>
                    <td className="px-4 py-3">{workspace.projectCount}</td>
                    <td className="px-4 py-3">{workspace.budgetStatus}</td>
                    <td className="px-4 py-3">{workspace.capacityStatus}</td>
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
          <button
            type="button"
            onClick={() => useAdminWorkspacesModalStore.getState().open()}
            className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Browse workspaces
          </button>
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Invite People
          </button>
          <Link
            to="/administration/governance"
            className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Open Governance Policies
          </Link>
          <Link
            to="/administration/templates"
            className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Open Templates
          </Link>
          <Link
            to="/administration/audit-trail"
            className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            View Audit Trail
          </Link>
        </div>
      </section>

      <InviteMembersDialog isOpen={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
