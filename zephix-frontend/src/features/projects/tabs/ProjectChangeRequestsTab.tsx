/**
 * ProjectChangeRequestsTab
 *
 * List / create / transition Change Requests for a project.
 * RBAC: All roles see list + create. OWNER/ADMIN see approve/reject/implement.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, X, Send, Check, XCircle, Wrench, Trash2 } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { useProjectContext } from '../layout/ProjectPageLayout';
import {
  listChangeRequests,
  createChangeRequest,
  submitChangeRequest,
  approveChangeRequest,
  rejectChangeRequest,
  implementChangeRequest,
  deleteChangeRequest,
} from '@/features/change-requests/changeRequests.api';
import type {
  ChangeRequest,
  ChangeRequestImpactScope,
  CreateChangeRequestInput,
} from '@/features/change-requests/types';

const IMPACT_SCOPES: ChangeRequestImpactScope[] = ['SCHEDULE', 'COST', 'SCOPE', 'RESOURCE'];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  IMPLEMENTED: 'bg-purple-100 text-purple-700',
};

export const ProjectChangeRequestsTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspaceId: workspaceId } = useWorkspaceStore();
  const { role } = useWorkspaceRole(workspaceId);

  const [items, setItems] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isApprover = role === 'OWNER' || role === 'ADMIN';

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await listChangeRequests(projectId);
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load change requests');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (id: string, action: string) => {
    if (!projectId) return;
    setActionLoading(id);
    try {
      if (action === 'submit') await submitChangeRequest(projectId, id);
      else if (action === 'approve') await approveChangeRequest(projectId, id);
      else if (action === 'reject') await rejectChangeRequest(projectId, id);
      else if (action === 'implement') await implementChangeRequest(projectId, id);
      else if (action === 'delete') await deleteChangeRequest(projectId, id);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Change Requests</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> New Change Request
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {showCreate && projectId && (
        <CreateCRForm
          projectId={projectId}
          onCreated={() => { setShowCreate(false); load(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {items.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No change requests yet. Create one to get started.
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Impact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Created</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((cr) => (
                <tr key={cr.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 max-w-[250px] truncate">{cr.title}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{cr.impactScope}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[cr.status] || ''}`}>
                      {cr.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {new Date(cr.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {cr.status === 'DRAFT' && (
                        <>
                          <ActionBtn
                            icon={<Send className="h-3.5 w-3.5" />}
                            label="Submit"
                            loading={actionLoading === cr.id}
                            onClick={() => handleAction(cr.id, 'submit')}
                          />
                          <ActionBtn
                            icon={<Trash2 className="h-3.5 w-3.5" />}
                            label="Delete"
                            loading={actionLoading === cr.id}
                            onClick={() => handleAction(cr.id, 'delete')}
                            variant="danger"
                          />
                        </>
                      )}
                      {cr.status === 'SUBMITTED' && isApprover && (
                        <>
                          <ActionBtn
                            icon={<Check className="h-3.5 w-3.5" />}
                            label="Approve"
                            loading={actionLoading === cr.id}
                            onClick={() => handleAction(cr.id, 'approve')}
                            variant="success"
                          />
                          <ActionBtn
                            icon={<XCircle className="h-3.5 w-3.5" />}
                            label="Reject"
                            loading={actionLoading === cr.id}
                            onClick={() => handleAction(cr.id, 'reject')}
                            variant="danger"
                          />
                        </>
                      )}
                      {cr.status === 'APPROVED' && (
                        <ActionBtn
                          icon={<Wrench className="h-3.5 w-3.5" />}
                          label="Implement"
                          loading={actionLoading === cr.id}
                          onClick={() => handleAction(cr.id, 'implement')}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

function ActionBtn({
  icon,
  label,
  loading,
  onClick,
  variant = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  loading: boolean;
  onClick: () => void;
  variant?: 'default' | 'success' | 'danger';
}) {
  const colors = {
    default: 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50',
    success: 'text-green-600 hover:text-green-700 hover:bg-green-50',
    danger: 'text-red-600 hover:text-red-700 hover:bg-red-50',
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={label}
      className={`p-1.5 rounded ${colors[variant]} disabled:opacity-50`}
    >
      {icon}
    </button>
  );
}

function CreateCRForm({
  projectId,
  onCreated,
  onCancel,
}: {
  projectId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [impactScope, setImpactScope] = useState<ChangeRequestImpactScope>('SCOPE');
  const [impactCost, setImpactCost] = useState('');
  const [impactDays, setImpactDays] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const input: CreateChangeRequestInput = {
        title: title.trim(),
        impactScope,
        description: description || undefined,
        reason: reason || undefined,
        impactCost: impactCost || undefined,
        impactDays: impactDays ? Number(impactDays) : undefined,
      };
      await createChangeRequest(projectId, input);
      onCreated();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">New Change Request</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
      </div>
      {error && (
        <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="Brief title for the change request"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Impact Scope *</label>
            <select
              value={impactScope}
              onChange={(e) => setImpactScope(e.target.value as ChangeRequestImpactScope)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {IMPACT_SCOPES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Impact Cost</label>
            <input
              value={impactCost}
              onChange={(e) => setImpactCost(e.target.value)}
              placeholder="e.g. 50000.00"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Impact Days</label>
          <input
            type="number"
            value={impactDays}
            onChange={(e) => setImpactDays(e.target.value)}
            min={0}
            placeholder="0"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="px-4 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProjectChangeRequestsTab;
