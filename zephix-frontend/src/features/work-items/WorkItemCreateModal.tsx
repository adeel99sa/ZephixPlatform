import { useState } from 'react';
import { createWorkItem } from './api';
import { WorkItemType, WorkItemStatus } from './types';
import { telemetry } from '@/lib/telemetry';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
  workspaceId: string;
  projectId: string;
}

export function WorkItemCreateModal({ open, onClose, onCreated, workspaceId, projectId }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<WorkItemType>(WorkItemType.TASK);
  const [status, setStatus] = useState<WorkItemStatus>(WorkItemStatus.TODO);
  const [points, setPoints] = useState<number | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function submit() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const task = await createWorkItem({
        workspaceId,
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        status,
        points,
      });
      telemetry.track('task.created', { taskId: task.id, projectId, workspaceId });
      onCreated(task.id);
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setType(WorkItemType.TASK);
      setStatus(WorkItemStatus.TODO);
      setPoints(undefined);
    } catch (e) {
      telemetry.track('task.create.error', { error: (e as Error).message });
      alert('Failed to create task.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30" data-testid="task-create-modal">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Create task</h2>

        <label className="block mb-2 text-sm">Title *</label>
        <input
          data-testid="task-title"
          className="w-full rounded border px-3 py-2 mb-3"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Task title..."
        />

        <label className="block mb-2 text-sm">Description</label>
        <textarea
          data-testid="task-description"
          className="w-full rounded border px-3 py-2 mb-3"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optional description..."
          rows={2}
        />

        <label className="block mb-2 text-sm">Type</label>
        <select
          data-testid="task-type"
          className="w-full rounded border px-3 py-2 mb-3"
          value={type}
          onChange={e => setType(e.target.value as WorkItemType)}
        >
          <option value={WorkItemType.TASK}>Task</option>
          <option value={WorkItemType.BUG}>Bug</option>
          <option value={WorkItemType.STORY}>Story</option>
          <option value={WorkItemType.EPIC}>Epic</option>
        </select>

        <label className="block mb-2 text-sm">Status</label>
        <select
          data-testid="task-status"
          className="w-full rounded border px-3 py-2 mb-3"
          value={status}
          onChange={e => setStatus(e.target.value as WorkItemStatus)}
        >
          <option value={WorkItemStatus.TODO}>Todo</option>
          <option value={WorkItemStatus.IN_PROGRESS}>In Progress</option>
          <option value={WorkItemStatus.DONE}>Done</option>
        </select>

        <label className="block mb-2 text-sm">Points</label>
        <input
          data-testid="task-points"
          type="number"
          min="0"
          max="100"
          className="w-full rounded border px-3 py-2 mb-4"
          value={points ?? ''}
          onChange={e => setPoints(e.target.value ? Number(e.target.value) : undefined)}
          placeholder="Optional story points..."
        />

        <div className="flex items-center justify-end gap-2">
          <button
            data-testid="task-create-cancel"
            className="rounded px-4 py-2 border"
            onClick={onClose}
            disabled={busy}
          >Cancel</button>
          <button
            data-testid="task-create-submit"
            className="rounded px-4 py-2 bg-black text-white disabled:opacity-50"
            onClick={submit}
            disabled={busy || !title.trim()}
          >{busy ? 'Creating…' : 'Create'}</button>
        </div>
      </div>
    </div>
  );
}

