import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { telemetry } from '@/lib/telemetry';

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

  async function onRename(id: string) {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    const name = prompt('New name', project.name)?.trim();
    if (!name || name === project.name) return;
    await renameProject(id, name);
    telemetry.track('ui.project.rename', { projectId: id });
    await refresh();
    // Notify parent to invalidate KPI cache
    window.dispatchEvent(new CustomEvent('project:updated', { detail: { workspaceId } }));
  }

  async function onDelete(id: string) {
    if (!confirm('Move project to trash?')) return;
    await deleteProject(id);
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
            <li key={project.id} className="group flex items-center justify-between px-3 py-1">
              <Link
                className="truncate text-sm hover:text-blue-600"
                to={`/projects/${project.id}/overview`}
                data-testid={`proj-${project.id}`}
              >
                {project.name}{project.deletedAt ? ' (deleted)' : ''}
              </Link>
              <div className="opacity-0 group-hover:opacity-100 transition flex gap-1">
                {!project.deletedAt && (
                  <>
                    <button data-testid={`proj-rename-${project.id}`} className="text-xs underline" onClick={() => onRename(project.id)}>Rename</button>
                    <button data-testid={`proj-delete-${project.id}`} className="text-xs underline text-red-600" onClick={() => onDelete(project.id)}>Delete</button>
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

      {/* Phase 4: Project creation moved to Template Center */}
      {/* ProjectCreateModal removed - use Template Center instead */}
    </div>
  );
}

