/**
 * ProjectPlanTab
 * 
 * Plan tab content - renders the existing ProjectPlanView component.
 * Also mounts the ActivationGuide overlay for first-time activation projects.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { ProjectPlanView } from '@/views/work-management/ProjectPlanView';
import { ActivationGuide } from '@/features/projects/components/ActivationGuide';

export const ProjectPlanTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) {
    return <div>Project ID is required</div>;
  }

  return (
    <>
      <ProjectPlanView />
      <ActivationGuide projectId={projectId} />
    </>
  );
};

export default ProjectPlanTab;
