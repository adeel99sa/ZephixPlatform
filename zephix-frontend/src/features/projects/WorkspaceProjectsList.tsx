import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { toast } from 'sonner';

import { telemetry } from '@/lib/telemetry';
import {
  PLATFORM_TRASH_RETENTION_DAYS,
  trashRetentionDeleteSentence,
} from '@/lib/platformRetention';

import { listProjects, renameProject, deleteProject, restoreProject } from './api';
import type { Project } from './types';
// Phase 4: ProjectCreateModal removed - project creation is now in Template Center

interface Props {
  workspaceId?: string;
}

export function WorkspaceProjectsList({ workspaceId }: Props) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [renameProjectId, setRenameProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [pendingDeleteProjectId, setPendingDeleteProjectId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const data = await listProjects(workspaceId);
      setProjects(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [workspaceId]);

  function startRename(id: string) {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    setRenameProjectId(id);
    setRenameValue(project.name);
  }

  async function commitRename(id: string) {
    const project = projects.find((p) => p.id === id);
    const name = renameValue.trim();
    setRenameProjectId(null);
    setRenameValue('');
    if (!project || !name || name === project.name) return;
    await renameProject(id, name);
    telemetry.track('ui.project.rename', { projectId: id });
    await refresh();
    window.dispatchEvent(new CustomEvent('project:updated', { detail: { workspaceId } }));
  }

  async function executeDelete(id: string) {
    const { trashRetentionDays } = await deleteProject(id);
    toast.success('Project moved to Archive & delete', {
      description: trashRetentionDeleteSentence(trashRetentionDays),
    });
    telemetry.track('ui.project.delete', { projectId: id });
    await refresh();
    // Notify parent to invalidate KPI cache
    window.dispatchEvent(new CustomEvent('project:updated', { detail: { workspaceId } }));
  }

  async function onRestore(id: string) {
    await restoreProject(id);
    telemetry.track('ui.project.restore', { projectId: id });
    await refresh();
    // Notify parent to invalidate KPI cache
    window.dispatchEvent(new CustomEvent('project:updated', { detail: { workspaceId } }));
  }

  return (
    <div data-testid="workspace-projects" className="mt-6">
      <div className="flex items-center justify-between px-3 mb-2">
        <span className="text-xs font-semibold tracking-wide uppercase text-gray-500">Projects</span>
        <Link
          to="/templates"
          className="rounded bg-blue-600 text-white text-xs px-2 py-1 hover:bg-blue-700"
          title="Create project from template"
          data-testid="project-new"
        >
          + New
        </Link>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2 px-3">
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
        </div>
      ) : (
        <ul className="space-y-1">
          {projects.map(project => (
            <li key={project.id} className="group flex items-center justify-between gap-2 px-3 py-1">
              {renameProjectId === project.id ? (
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void commitRename(project.id);
                    if (e.key === 'Escape') {
                      setRenameProjectId(null);
                      setRenameValue('');
                    }
                  }}
                  onBlur={() => void commitRename(project.id)}
                  className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-0.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  autoFocus
                  data-testid={`proj-rename-input-${project.id}`}
                />
              ) : (
                <Link
                  className="truncate text-sm hover:text-blue-600"
                  to={`/projects/${project.id}/overview`}
                  data-testid={`proj-${project.id}`}
                >
                  {project.name}{project.deletedAt ? ' (deleted)' : ''}
                </Link>
              )}
              <div className="opacity-0 group-hover:opacity-100 transition flex shrink-0 gap-1">
                {!project.deletedAt && (
                  <>
                    <button data-testid={`proj-rename-${project.id}`} className="text-xs underline" onClick={() => startRename(project.id)}>Rename</button>
                    <button data-testid={`proj-delete-${project.id}`} className="text-xs underline text-red-600" onClick={() => setPendingDeleteProjectId(project.id)}>Delete</button>
                  </>
                )}
                {project.deletedAt && (
                  <button data-testid={`proj-restore-${project.id}`} className="text-xs underline" onClick={() => onRestore(project.id)}>Restore</button>
                )}
              </div>
            </li>
          ))}
          {projects.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500" data-testid="proj-empty">No projects yet</li>
          )}
        </ul>
      )}

      {pendingDeleteProjectId && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="proj-delete-dialog-title"
          data-testid="proj-delete-dialog"
        >
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
            <h3
              id="proj-delete-dialog-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              Move project to Archive & delete?
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {trashRetentionDeleteSentence(PLATFORM_TRASH_RETENTION_DAYS)}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteProjectId(null)}
                className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = pendingDeleteProjectId;
                  setPendingDeleteProjectId(null);
                  if (id) void executeDelete(id);
                }}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 4: Project creation moved to Template Center */}
      {/* ProjectCreateModal removed - use Template Center instead */}
    </div>
  );
}

