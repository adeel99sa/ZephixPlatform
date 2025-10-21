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

  // Fetch projects using React Query
  const {
    data: projectsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await apiClient.get<{ projects: Project[] }>(API_ENDPOINTS.PROJECTS.LIST);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

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

  const projects = projectsData?.projects || [];

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
      <PageHeader
        title="Projects"
        description="Manage your projects and track their progress"
        actions={
          <Button onClick={handleCreateProject}>
            Create Project
          </Button>
        }
      />

      {error && (
        <ErrorBanner
          description={error.message || 'Failed to load projects'}
          onRetry={() => refetch()}
          retryLabel="Retry"
        />
      )}

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={projects}
          caption="Projects list with sorting and filtering capabilities"
          loading={isLoading}
          emptyState={
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No projects found</h3>
              <p className="text-muted-foreground mb-4">Create your first project to get started with project management.</p>
              <Button onClick={handleCreateProject}>
                Create Project
              </Button>
            </div>
          }
        />
      </div>

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