/**
 * ProjectPlanTab
 * 
 * Plan tab content - renders the existing ProjectPlanView component.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { ProjectPlanView } from '@/views/work-management/ProjectPlanView';

export const ProjectPlanTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) {
    return <div>Project ID is required</div>;
  }

  return <ProjectPlanView />;
};

export default ProjectPlanTab;
