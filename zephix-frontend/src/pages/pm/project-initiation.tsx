import React from 'react';
import { useRouter } from 'next/router';
import ProjectInitiationDashboard from '../../components/pm/project-initiation/ProjectInitiationDashboard';

const ProjectInitiationPage: React.FC = () => {
  const router = useRouter();

  const handleProjectCreated = (projectId: string) => {
    // Navigate to project dashboard or next workflow
    router.push(`/pm/projects/${projectId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ProjectInitiationDashboard onProjectCreated={handleProjectCreated} />
    </div>
  );
};

export default ProjectInitiationPage;
