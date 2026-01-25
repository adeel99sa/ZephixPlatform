import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// import { projectService } from '../../services/projectService';
import { CreateProjectPanel } from '../../components/projects/CreateProjectPanel';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useProjects } from '../../features/workspaces/api';
import { getErrorText } from '../../lib/api/errors';
import { useAuth } from '../../state/AuthContext';

const ProjectsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  // const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ws = useWorkspaceStore();
  const { data, isLoading, error } = useProjects(ws.current?.id, {
    enabled: !authLoading && !!user, // Only run query when auth is ready
  });

  // Guard: Don't render until auth state is READY
  if (authLoading) {
    return <div className="text-sm text-slate-500">Loading authentication...</div>;
  }
  if (!user) {
    return <div className="text-sm text-slate-500">Please log in to view projects</div>;
  }

  if (!ws.current) return <div className="text-sm text-slate-500">Select a workspace</div>;
  if (isLoading) return <div>Loading projects…</div>;
  if (error) return <div className="text-red-600">{getErrorText(error)}</div>;

  const list = Array.isArray(data) ? data : [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Projects — {ws.current.name}</h1>
          <button className="rounded-md border px-3 py-1 text-sm"
            onClick={() => document.getElementById("ws-menu-btn")?.click()}>
            New…
          </button>
        </div>
      </div>

      {!list.length ? (
        <div className="text-sm text-slate-500">No projects yet. Use "New…" to create one.</div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {list.map(p => (
            <li key={p.id} className="rounded-md border p-3">
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-slate-500">{p.folderCount ?? 0} folders</div>
            </li>
          ))}
        </ul>
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
