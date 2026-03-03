import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { isGuestUser } from '@/utils/roles';
import { toast } from 'sonner';
import { FileText, Plus, X } from 'lucide-react';
import type {
  ChangeRequest,
  ChangeRequestImpactScope,
} from '@/features/change-requests/types';
import {
  listChangeRequests,
  createChangeRequest,
} from '@/features/change-requests/changeRequests.api';
import { InlineLoadingState, EmptyStateCard } from '@/components/ui/states';

const IMPACT_SCOPE_OPTIONS: ChangeRequestImpactScope[] = ['SCOPE', 'SCHEDULE', 'COST', 'RESOURCE'];

const STATUS_COLORS: Record<ChangeRequest['status'], string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  IMPLEMENTED: 'bg-emerald-100 text-emerald-800',
};

export const ProjectChangeTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { user } = useAuth();
  const canCreate = !isGuestUser(user);

  const [items, setItems] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadList = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await listChangeRequests(projectId);
      setItems(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load change requests');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  if (!projectId || !activeWorkspaceId) {
    return <div className="p-6 text-slate-500">No project selected.</div>;
  }

  return (
    <div data-testid="change-requests-root">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Change Requests</h2>
          <span className="text-sm text-slate-400">({items.length})</span>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            data-testid="cr-create-btn"
          >
            <Plus className="h-4 w-4" /> New Change Request
          </button>
        )}
      </div>

      {loading && <InlineLoadingState message="Loading changes..." />}
      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      {!loading && items.length === 0 && (
        <EmptyStateCard
          title="No change requests"
          description="Track project changes and their approval status here."
          variant="default"
          icon={FileText}
        />
      )}

      {!loading && items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white" data-testid="cr-list">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Title</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Impact Scope</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Updated</th>
              </tr>
            </thead>
            <tbody>
              {items.map((cr) => (
                <tr key={cr.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-900">{cr.title}</td>
                  <td className="px-4 py-2 text-slate-600">{cr.impactScope}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[cr.status]}`}>
                      {cr.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{new Date(cr.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateChangeRequestModal
          projectId={projectId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            loadList();
          }}
        />
      )}
    </div>
  );
};

function CreateChangeRequestModal({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [impactScope, setImpactScope] = useState<ChangeRequestImpactScope>('SCOPE');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setSaving(true);
      await createChangeRequest(projectId, {
        title: title.trim(),
        impactScope,
        description: description.trim() || undefined,
      });
      toast.success('Change request created');
      onCreated();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="cr-create-modal">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">New Change Request</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Change request title"
              data-testid="cr-title-input"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Impact Scope *</label>
            <select
              value={impactScope}
              onChange={(e) => setImpactScope(e.target.value as ChangeRequestImpactScope)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              data-testid="cr-type-select"
            >
              {IMPACT_SCOPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Optional description"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            data-testid="cr-save-btn"
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProjectChangeTab;
