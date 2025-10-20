import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

import { CreateProjectPanel } from '../../components/projects/CreateProjectPanel';
import { PageHeader } from '../../components/ui/layout/PageHeader';
import { Button } from '../../components/ui/button/Button';
import { ProjectsTable } from '../../features/projects/components/ProjectsTable';
import { Project } from '../../features/projects/api/useProjects';

const ProjectsPage: React.FC = () => {
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get initial params from URL
  const initialParams = {
    search: searchParams.get('search') || undefined,
    status: searchParams.get('status') || undefined,
    owner: searchParams.get('owner') || undefined,
    page: parseInt(searchParams.get('page') || '1'),
    pageSize: parseInt(searchParams.get('pageSize') || '20'),
  };

  const handleCreateProject = (): void => {
    setShowCreatePanel(true);
  };

  const handleProjectClick = (project: Project): void => {
    navigate(`/projects/${project.id}`);
  };

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

      <div className="mt-6">
        <ProjectsTable
          initialParams={initialParams}
          onProjectClick={handleProjectClick}
        />
      </div>

      {/* Create Project Panel */}
      <CreateProjectPanel
        isOpen={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
        onSuccess={() => {
          setShowCreatePanel(false);
          // The table will automatically refetch due to React Query
        }}
      />
    </div>
  );
};

export default ProjectsPage;