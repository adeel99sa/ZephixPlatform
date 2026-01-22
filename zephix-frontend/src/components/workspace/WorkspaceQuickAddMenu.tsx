import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import api, { unwrapApiData } from '@/services/api';

type Props = {
  workspaceId: string;
  onClose: () => void;
};

type CreateProjectResponse = { id: string } | { projectId: string };
type CreateDocResponse = { docId: string };

function getId(x: any): string | null {
  if (!x) return null;
  if (typeof x.id === 'string') return x.id;
  if (typeof x.projectId === 'string') return x.projectId;
  return null;
}

export function WorkspaceQuickAddMenu({ workspaceId, onClose }: Props) {
  const nav = useNavigate();
  const [open, setOpen] = useState(true);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        onClose();
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [onClose]);

  async function createProject() {
    try {
      const res = await api.post(`/workspaces/${workspaceId}/projects`, {
        name: 'New Project',
      });
      const data = unwrapApiData<CreateProjectResponse>(res.data);
      const projectId = getId(data);
      if (!projectId) throw new Error('Create project failed. Missing id.');
      toast.success('Project created');
      onClose();
      nav(`/workspaces/${workspaceId}/projects/${projectId}?view=list`, { replace: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Create project failed');
    }
  }

  async function createDoc() {
    try {
      const res = await api.post(`/workspaces/${workspaceId}/docs`, { title: 'New Doc' });
      const data = unwrapApiData<CreateDocResponse>(res.data);
      if (!data?.docId) throw new Error('Create doc failed. Missing docId.');
      toast.success('Doc created');
      onClose();
      nav(`/workspaces/${workspaceId}/docs/${data.docId}`, { replace: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Create doc failed');
    }
  }

  function inviteMembers() {
    onClose();
    nav(`/workspaces/${workspaceId}/settings?tab=members`);
  }

  function openTemplates() {
    onClose();
    nav('/templates');
  }

  if (!open) return null;

  return (
    <div ref={rootRef} className="absolute right-0 top-9 z-50 w-56 rounded-lg border bg-white shadow">
      <button type="button" onClick={createProject} className="w-full px-3 py-2 text-left hover:bg-gray-50">
        New Project
      </button>
      <button type="button" onClick={createDoc} className="w-full px-3 py-2 text-left hover:bg-gray-50">
        New Doc
      </button>
      <button type="button" onClick={inviteMembers} className="w-full px-3 py-2 text-left hover:bg-gray-50">
        Invite Members
      </button>
      <button type="button" onClick={openTemplates} className="w-full px-3 py-2 text-left hover:bg-gray-50">
        Template Center
      </button>
    </div>
  );
}
