import { useState } from 'react';

import { useAuth } from '@/state/AuthContext';
import { telemetry } from '@/lib/telemetry';

import { createWorkspace } from './api';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function WorkspaceCreateModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();

  if (!open) return null;
  if (!user?.organizationId) {
    console.error('No organizationId; halting per rules');
    return null;
  }

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const ws = await createWorkspace({ name, slug: slug || undefined });
      telemetry.track('ui.workspace.create.success', { workspaceId: ws.id });
      onCreated(ws.id);
      onClose();
    } catch (e) {
      telemetry.track('ui.workspace.create.error', { message: (e as Error).message });
      alert('Failed to create workspace.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" data-testid="workspace-create-modal">
        <h2 className="text-lg font-semibold mb-4">Create workspace</h2>
        <label className="block mb-2 text-sm">Name</label>
        <input
          data-testid="workspace-name-input"
          className="w-full rounded border px-3 py-2 mb-3"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Design, Engineering, Ops..."
        />
        <label className="block mb-2 text-sm">Slug (optional)</label>
        <input
          data-testid="workspace-slug-input"
          className="w-full rounded border px-3 py-2 mb-4"
          value={slug}
          onChange={e => setSlug(e.target.value)}
          placeholder="engineering"
        />
        <div className="flex items-center justify-end gap-2">
          <button
            data-testid="workspace-cancel"
            className="rounded px-4 py-2 border"
            onClick={onClose}
            disabled={busy}
          >Cancel</button>
          <button
            data-testid="workspace-create"
            className="rounded px-4 py-2 bg-black text-white disabled:opacity-50"
            onClick={submit}
            disabled={busy}
          >{busy ? 'Creating…' : 'Create'}</button>
        </div>
      </div>
    </div>
  );
}

