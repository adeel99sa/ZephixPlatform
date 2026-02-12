import { useParams } from 'react-router-dom';
import { SprintsTab } from '@/features/sprints/SprintsTab';
import { useWorkspaceStore } from '@/state/workspace.store';

export const ProjectSprintsTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspaceId } = useWorkspaceStore();

  if (!projectId || !activeWorkspaceId) {
    return <p className="text-sm text-gray-500 p-4">Loading...</p>;
  }

  return <SprintsTab projectId={projectId} workspaceId={activeWorkspaceId} />;
};
