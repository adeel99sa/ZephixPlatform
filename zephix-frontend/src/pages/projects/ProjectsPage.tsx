import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { CreateProjectPanel } from '../../components/projects/CreateProjectPanel';
import { Button } from '../../components/ui/button/Button';
import { apiClient } from '../../lib/api/client';
import { API_ENDPOINTS } from '../../lib/api/endpoints';
import { useWorkspaceStore } from '../../state/workspace.store';
import { useProjects, type ProjectListItem } from '../../features/projects/hooks';
import { getErrorText } from '../../lib/api/errors';
import { useAuth } from '../../state/AuthContext';

const ProjectsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Use the new workspace store with activeWorkspaceId
  const { activeWorkspaceId, workspaceReady } = useWorkspaceStore();
  
  // Fetch projects for the active workspace
  // Query is disabled until workspace is ready
  const { data, isLoading, error } = useProjects(activeWorkspaceId, {
    enabled: !authLoading && !!user && workspaceReady,
  });

  // Delete project mutation - must be before early returns per Rules of Hooks
  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(API_ENDPOINTS.PROJECTS.DELETE(id));
    },
    onSuccess: () => {
      // Invalidate and refetch projects
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  // Guard: Don't render until auth state is READY
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
        <div className="text-sm text-slate-500">Please log in to view projects</div>
      </div>
    );
  }

  // Workspace guard - DashboardLayout should prevent this, but double-check
  if (!workspaceReady || !activeWorkspaceId) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <div className="text-sm text-slate-500">No workspace selected</div>
        <Button variant="primary" size="sm" onClick={() => navigate('/select-workspace')}>
          Select Workspace
        </Button>
      </div>
    );
  }

  const list: ProjectListItem[] = Array.isArray(data) ? data : [];

  // Delete handler - ready for use when UI connects delete buttons
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDeleteProject = (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    deleteProjectMutation.mutate(id);
  };

  const handleCreateProject = () => {
    setShowCreatePanel(true);
  };

  // Handle project click - navigate to project overview
  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      planning: 'bg-blue-100 text-blue-800',
      'on-hold': 'bg-yellow-100 text-yellow-800',
      completed: 'bg-slate-100 text-slate-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            {list.length} project{list.length !== 1 ? 's' : ''} in this workspace
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleCreateProject}
        >
          New Project
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <div className="text-sm text-slate-500">Loading projects...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getErrorText(error)}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && list.length === 0 && (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50">
          <div className="text-center">
            <div className="text-sm font-medium text-slate-600">No projects yet</div>
            <div className="mt-1 text-sm text-slate-500">
              Create a new project to get started
            </div>
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              onClick={handleCreateProject}
            >
              Create Project
            </Button>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {!isLoading && !error && list.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => handleProjectClick(project.id)}
              className="group rounded-lg border bg-white p-4 text-left shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium text-slate-900 group-hover:text-indigo-600">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {project.description}
                    </p>
                  )}
                </div>
                <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadge(project.status)}`}>
                  {project.status}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                {project.startDate && (
                  <span>Started {new Date(project.startDate).toLocaleDateString()}</span>
                )}
                {project.endDate && (
                  <span>Due {new Date(project.endDate).toLocaleDateString()}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Create Project Panel */}
      <CreateProjectPanel
        isOpen={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
        onSuccess={() => {
          setShowCreatePanel(false);
          queryClient.invalidateQueries({ queryKey: ['projects'] });
        }}
      />
    </div>
  );
};

export default ProjectsPage;
