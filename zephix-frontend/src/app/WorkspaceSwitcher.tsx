import { useState, useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { listWorkspaces } from '@/features/workspaces/api';
import type { Workspace } from '@/features/workspaces/types';

export default function WorkspaceSwitcher() {
  const { workspaceId, setWorkspaceId } = useUIStore();
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      const data = await listWorkspaces();
      setWorkspaces(data || []);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  };

  const current = workspaces.find(w => w.id === workspaceId) ?? workspaces[0];

  if (loading) {
    return (
      <div className="w-full flex items-center justify-between rounded-lg px-3 py-2">
        <span className="truncate text-gray-400">Loading...</span>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="w-full flex items-center justify-between rounded-lg px-3 py-2">
        <span className="truncate text-gray-400">No workspaces</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button className="w-full flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-100"
              onClick={() => setOpen(v => !v)}>
        <span className="truncate">{current?.name || 'Select workspace'}</span>
        <span className="i-lucide-chevron-down" />
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow">
          {workspaces.map(w => (
            <button key={w.id}
              className="w-full text-left px-3 py-2 hover:bg-gray-50"
              onClick={() => { setWorkspaceId(w.id); setOpen(false); }}>
              {w.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
