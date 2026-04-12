import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import {
  administrationApi,
  type WorkspaceSnapshotRow,
} from "@/features/administration/api/administration.api";
import { WorkspaceMemberPanel } from "./WorkspaceMemberPanel";

export type AdministrationWorkspacesPanelProps = {
  /** When false, skip network loads (modal closed). */
  isActive: boolean;
  /** Called when user navigates away (e.g. clicks a workspace name). */
  onNavigate?: () => void;
};

function statusClass(status: string): string {
  const u = status.toUpperCase();
  if (u === "ACTIVE") return "text-emerald-700";
  if (u === "ARCHIVED") return "text-slate-500";
  return "text-slate-700";
}

/**
 * Org workspace directory — table + snapshot + members (modal body; chrome lives on the modal).
 */
export function AdministrationWorkspacesPanel({ isActive, onNavigate }: AdministrationWorkspacesPanelProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSnapshotRow[]>([]);
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshotRow[]>([]);
  const [memberPanel, setMemberPanel] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!isActive) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      const results = await Promise.allSettled([
        administrationApi.listWorkspaces(),
        administrationApi.getWorkspaceSnapshot({ page: 1, limit: 100 }),
      ]);
      if (!active) return;
      if (results[0].status === "fulfilled") {
        setWorkspaces(results[0].value);
      } else {
        setError("Failed to load workspaces.");
        setWorkspaces([]);
      }
      if (results[1].status === "fulfilled") {
        setSnapshot(results[1].value.data);
      }
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [isActive]);

  return (
    <div className="space-y-8">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/80">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-[1] border-b border-slate-100 bg-slate-50/95 backdrop-blur-sm">
              <tr className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Workspace</th>
                <th className="px-4 py-3 font-medium">Owners</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Projects</th>
                <th className="px-4 py-3 font-medium">Exceptions</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={6}>
                    Loading workspaces…
                  </td>
                </tr>
              ) : workspaces.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={6}>
                    No workspaces yet.
                  </td>
                </tr>
              ) : (
                workspaces.map((workspace) => (
                  <tr key={workspace.workspaceId} className="text-slate-700 transition-colors hover:bg-slate-50/80">
                    <td className="px-4 py-3.5 font-medium">
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate?.();
                          navigate(`/workspaces/${workspace.workspaceId}/home`);
                        }}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {workspace.workspaceName}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {workspace.owners.map((owner) => owner.name).join(", ") || "—"}
                    </td>
                    <td className={`px-4 py-3.5 text-xs font-semibold uppercase ${statusClass(workspace.status)}`}>
                      {workspace.status}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-slate-600">{workspace.projectCount}</td>
                    <td className="px-4 py-3.5 tabular-nums text-slate-600">{workspace.openExceptions}</td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setMemberPanel({ id: workspace.workspaceId, name: workspace.workspaceName })
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
                      >
                        <Users className="h-3.5 w-3.5 text-slate-500" />
                        Members
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Workspace snapshot</h2>
        {snapshot.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No governance snapshot data yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {snapshot.map((row) => (
              <li
                key={`snapshot-${row.workspaceId}`}
                className="rounded-lg border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
              >
                <p className="font-medium text-slate-900">{row.workspaceName}</p>
                <p className="mt-1 text-xs text-slate-600">
                  Budget {row.budgetStatus} · Capacity {row.capacityStatus}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <WorkspaceMemberPanel
        isOpen={memberPanel !== null}
        onClose={() => setMemberPanel(null)}
        workspaceId={memberPanel?.id ?? ""}
        workspaceName={memberPanel?.name ?? ""}
      />
    </div>
  );
}
