import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// import { projectService } from '../../services/projectService';
import { CreateProjectPanel } from '../../components/projects/CreateProjectPanel';
import { PageHeader } from '../../components/ui/layout/PageHeader';
import { Button } from '../../components/ui/button/Button';
import { DataTable, Column } from '../../components/ui/table/DataTable';
import { ErrorBanner } from '../../components/ui/feedback/ErrorBanner';
import { apiClient } from '../../lib/api/client';
import { API_ENDPOINTS } from '../../lib/api/endpoints';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useProjects } from '../../features/workspaces/api';
import { getErrorText } from '../../lib/api/errors';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

const ProjectsPage: React.FC = () => {
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  // const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ws = useWorkspaceStore();
  const { data, isLoading, error } = useProjects(ws.current?.id);

  if (!ws.current) return <div className="text-sm text-slate-500">Select a workspace</div>;
  if (isLoading) return <div>Loading projects…</div>;
  if (error) return <div className="text-red-600">{getErrorText(error)}</div>;

  const list = Array.isArray(data) ? data : [];

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(API_ENDPOINTS.PROJECTS.DELETE(id));
    },
    onSuccess: () => {
      // Invalidate and refetch projects
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    deleteProjectMutation.mutate(id);
  };

  const handleCreateProject = () => {
    setShowCreatePanel(true);
  };

  const projects = list;

  // Define columns for the DataTable
  const columns: Column<Project>[] = [
    {
      id: 'name',
      header: 'Project Name',
      accessor: (project) => (
        <Link 
          to={`/projects/${project.id}`} 
          className="text-primary hover:text-primary/80 font-medium"
        >
          {project.name}
        </Link>
      ),
      sortable: true,
      filterable: true,
    },
    {
      id: 'description',
      header: 'Description',
      accessor: (project) => project.description || 'No description',
      sortable: true,
      filterable: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (project) => (
        <span className={`px-2 py-1 rounded text-sm ${
          project.status === 'active' ? 'bg-green-100 text-green-800' :
          project.status === 'planning' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {project.status}
        </span>
      ),
      sortable: true,
      filterable: true,
    },
    {
      id: 'startDate',
      header: 'Start Date',
      accessor: (project) => project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not set',
      sortable: true,
    },
    {
      id: 'endDate',
      header: 'End Date',
      accessor: (project) => project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Not set',
      sortable: true,
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (project) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDeleteProject(project.id)}
          className="text-destructive hover:text-destructive"
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Projects — {ws.current.name}</h1>
          <button className="rounded-md border px-3 py-1 text-sm"
            onClick={() => document.getElementById("ws-menu-btn")?.click()}>
            New…
          </button>
        </div>
      </div>

      {!list.length ? (
        <div className="text-sm text-slate-500">No projects yet. Use "New…" to create one.</div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {list.map(p => (
            <li key={p.id} className="rounded-md border p-3">
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-slate-500">{p.folderCount ?? 0} folders</div>
            </li>
          ))}
        </ul>
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