import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { ProjectCard } from '../../components/ui/ProjectCard';
import { CreateProjectModal } from '../../components/modals/CreateProjectModal';
import { useProjectStore } from '../../stores/projectStore';
import { PlusIcon } from '@heroicons/react/24/outline';
import type { Project } from '../../types';

export const ProjectsDashboard: React.FC = () => {
  const { projects, fetchProjects, isLoading, error } = useProjectStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleProjectClick = (project: Project) => {
    // Navigate to project details or open project
    console.log('Project clicked:', project);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-3">Error Loading Projects</h1>
          <p className="text-gray-400 mb-6">{error.message}</p>
          <Button onClick={fetchProjects}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Projects</h1>
              <p className="text-gray-400 mt-1">
                Manage your AI-powered project portfolio
              </p>
            </div>
            <Button
              onClick={handleCreateProject}
              leftIcon={<PlusIcon className="w-4 h-4" />}
              className="px-6 py-3"
            >
              Create Project
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-xl px-6 py-5 animate-pulse">
                <div className="h-4 bg-gray-700 rounded mb-4"></div>
                <div className="h-3 bg-gray-700 rounded mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <PlusIcon className="w-8 h-8 text-gray-400" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-white mb-3">
              No projects yet
            </h3>
            <p className="text-gray-400 mb-6">
              Create your first project to get started with AI-powered project management
            </p>
            <Button
              onClick={handleCreateProject}
              leftIcon={<PlusIcon className="w-4 h-4" />}
              className="px-6 py-3"
            >
              Create Your First Project
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleProjectClick(project)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        onSuccess={() => {
          handleCloseModal();
          fetchProjects();
        }}
      />
    </div>
  );
};
