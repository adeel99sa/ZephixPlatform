import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import {
  administrationApi,
  type WorkspaceSnapshotRow,
} from "@/features/administration/api/administration.api";
import { WorkspaceMemberPanel } from "../components/WorkspaceMemberPanel";

export default function AdministrationWorkspacesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSnapshotRow[]>([]);
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshotRow[]>([]);
  const [memberPanel, setMemberPanel] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [listData, snapshotData] = await Promise.all([
          administrationApi.listWorkspaces(),
          administrationApi.getWorkspaceSnapshot({ page: 1, limit: 100 }),
        ]);
        if (!active) return;
        setWorkspaces(listData);
        setSnapshot(snapshotData.data);
      } catch {
        if (!active) return;
        setError("Failed to load workspaces.");
        setWorkspaces([]);
        setSnapshot([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Workspaces</h1>
          <p className="mt-1 text-sm text-gray-600">
            Workspace list, ownership, and status across the organization.
          </p>
        </div>
        <Link
          to="/workspaces"
          className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Create workspace
        </Link>
      </header>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Workspace</th>
                <th className="px-4 py-3">Workspace Owners</th>
                <th className="px-4 py-3">Workspace Status</th>
                <th className="px-4 py-3">Project Count</th>
                <th className="px-4 py-3">Open Exceptions</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-gray-500" colSpan={6}>
                    Loading workspaces...
                  </td>
                </tr>
              ) : workspaces.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-gray-500" colSpan={6}>
                    No workspaces available.
                  </td>
                </tr>
              ) : (
                workspaces.map((workspace) => (
                  <tr
                    key={workspace.workspaceId}
                    className="border-t border-gray-200 text-sm text-gray-700"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{workspace.workspaceName}</td>
                    <td className="px-4 py-3">
                      {workspace.owners.map((owner) => owner.name).join(", ") || "Unassigned"}
                    </td>
                    <td className="px-4 py-3">{workspace.status}</td>
                    <td className="px-4 py-3">{workspace.projectCount}</td>
                    <td className="px-4 py-3">{workspace.openExceptions}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setMemberPanel({ id: workspace.workspaceId, name: workspace.workspaceName })}
                        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <Users className="h-3.5 w-3.5" />
                        Members
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Workspace Snapshot</h2>
        {snapshot.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No snapshot rows available.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {snapshot.map((row) => (
              <div
                key={`snapshot-${row.workspaceId}`}
                className="rounded border border-gray-200 p-3 text-sm text-gray-700"
              >
                <p className="font-medium text-gray-900">{row.workspaceName}</p>
                <p className="mt-1">
                  Budget: {row.budgetStatus} • Capacity: {row.capacityStatus}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <WorkspaceMemberPanel
        isOpen={memberPanel !== null}
        onClose={() => setMemberPanel(null)}
        workspaceId={memberPanel?.id ?? ""}
        workspaceName={memberPanel?.name ?? ""}
      />
    </div>
  );
}
