import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "../../components/ui/button/Button";
import { useAuth } from "../../state/AuthContext";
import { useWorkspaceStore } from "../../state/workspace.store";
import {
  useArchivedProjects,
  useRestoreProject,
} from "../../features/projects/hooks";
import { getErrorText } from "../../lib/api/errors";
import type { Project } from "../../features/projects/types";

const ArchivedProjectsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { activeWorkspaceId, workspaceReady } = useWorkspaceStore();

  const { data, isLoading, error, refetch } = useArchivedProjects(
    activeWorkspaceId,
    {
      enabled: !authLoading && !!user && workspaceReady,
      page: 1,
      limit: 50,
    },
  );

  const restoreMutation = useRestoreProject();

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-slate-500">Please log in to view archived projects</div>
      </div>
    );
  }

  if (!workspaceReady || !activeWorkspaceId) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <div className="text-sm text-slate-500">No workspace selected</div>
        <Button variant="primary" size="sm" onClick={() => navigate("/select-workspace")}>
          Select Workspace
        </Button>
      </div>
    );
  }

  const projects: Project[] = data?.projects ?? [];
  const total = data?.total ?? 0;

  async function handleRestore(projectId: string, name: string): Promise<void> {
    if (
      !window.confirm(
        `Restore "${name}"? It will move back to the active project list.`,
      )
    ) {
      return;
    }
    try {
      await restoreMutation.mutateAsync(projectId);
      toast.success("Project restored");
      await refetch();
    } catch (e: unknown) {
      toast.error(getErrorText(e));
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Archived projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            Soft-deleted projects in this workspace ({total} total)
          </p>
        </div>
        <Link
          to="/projects"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          ← Back to active projects
        </Link>
      </div>

      {isLoading && (
        <div className="flex h-48 items-center justify-center text-sm text-slate-500">
          Loading archived projects…
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getErrorText(error)}
        </div>
      )}

      {!isLoading && !error && projects.length === 0 && (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-600">No archived projects in this workspace.</p>
        </div>
      )}

      {!isLoading && !error && projects.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">Archived</th>
                <th className="px-4 py-3 text-right font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.deletedAt
                      ? new Date(p.deletedAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={restoreMutation.isPending}
                      onClick={() => void handleRestore(p.id, p.name)}
                    >
                      Restore
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ArchivedProjectsPage;
