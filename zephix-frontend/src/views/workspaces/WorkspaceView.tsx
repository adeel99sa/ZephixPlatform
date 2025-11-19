import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkspaceStore } from '@/state/workspace.store';
import WorkspaceHome from '@/features/workspaces/views/WorkspaceHome';

export default function WorkspaceView() {
  const { id } = useParams();
  const { setActiveWorkspace } = useWorkspaceStore();

  useEffect(() => {
    if (id) {
      setActiveWorkspace(id);
    }
  }, [id, setActiveWorkspace]);

  return <WorkspaceHome />;
}

