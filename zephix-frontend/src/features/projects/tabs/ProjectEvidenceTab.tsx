/**
 * ProjectEvidenceTab — Step 17.4
 *
 * Wraps ExecutionEvidencePanel for the project tab view.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { ExecutionEvidencePanel } from '@/features/work-management/components/ExecutionEvidencePanel';

export const ProjectEvidenceTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) {
    return (
      <div className="p-6 text-center text-gray-500 text-sm">
        No project selected
      </div>
    );
  }

  return (
    <div className="p-4">
      <ExecutionEvidencePanel scope="project" id={projectId} />
    </div>
  );
};

export default ProjectEvidenceTab;
