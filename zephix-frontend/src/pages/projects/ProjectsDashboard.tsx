import React, { useEffect, useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ProjectCard } from '../../components/ui/ProjectCard';
import { CreateProjectModal } from '../../components/modals/CreateProjectModal';
import { useProjectStore } from '../../stores/projectStore';
import { projectsApi } from '../../services/api';
import { toast } from 'sonner';

export const ProjectsDashboard: React.FC = () => {
  const {
    projects,
    isLoading,
    error,
    setProjects,
    setLoading,
    setError,
  } = useProjectStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await projectsApi.getAll();
      setProjects(response.projects);
    } catch (error) {
      setError('Failed to load projects');
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectCreated = () => {
    setIsCreateModalOpen(false);
    loadProjects(); // Refresh the projects list
    toast.success('Project created successfully!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadProjects}>Try Again</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage and track all your projects in one place
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <PlusIcon className="h-full w-full" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No projects yet
          </h3>
          <p className="text-gray-500 mb-6">
            Get started by creating your first project
          </p>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Your First Project
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => {
                // TODO: Navigate to project detail page
                console.log('Navigate to project:', project.id);
              }}
            />
          ))}
        </div>
      )}

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleProjectCreated}
      />
    </div>
  );
}; 