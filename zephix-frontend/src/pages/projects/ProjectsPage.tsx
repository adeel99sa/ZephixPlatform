import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../../services/projectService';
import { CreateProjectPanel } from '../../components/projects/CreateProjectPanel';
import { PageHeader } from '../../components/ui/layout/PageHeader';
import { Button } from '../../components/ui/button/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/card/Card';
import { Skeleton, SkeletonLines } from '../../components/ui/feedback/Skeleton';
import { ErrorBanner } from '../../components/ui/feedback/ErrorBanner';
import { EmptyState } from '../../components/ui/feedback/EmptyState';
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
  const navigate = useNavigate();
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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardBody>
                <SkeletonLines lines={3} />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects found"
          description="Create your first project to get started with project management."
          action={
            <Button onClick={handleCreateProject}>
              Create Project
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Link 
                  to={`/projects/${project.id}`} 
                  className="text-xl font-semibold text-primary hover:text-primary/80"
                >
                  {project.name}
                </Link>
              </CardHeader>
              <CardBody>
                <p className="text-muted-foreground mb-4">
                  {project.description || 'No description'}
                </p>
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-1 rounded text-sm ${
                    project.status === 'active' ? 'bg-green-100 text-green-800' :
                    project.status === 'planning' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {project.status}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteProject(project.id);
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    Delete
                  </Button>
                </div>
              </CardBody>
            </Card>
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