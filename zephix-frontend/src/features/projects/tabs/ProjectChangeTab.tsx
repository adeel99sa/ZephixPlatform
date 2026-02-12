/**
 * ProjectChangeTab — Change Requests list + detail + create for a project.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { isAdminUser, isGuestUser } from '@/utils/roles';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  X,
  ChevronRight,
  Link2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  ThumbsUp,
  ThumbsDown,
  Rocket,
  Ban,
  Paperclip,
} from 'lucide-react';
import type {
  ChangeRequest,
  ChangeRequestDetail,
  ChangeRequestType,
  ChangeRequestStatus,
  CreateChangeRequestInput,
} from '@/features/change-requests/changeRequests.api';
import {
  listChangeRequests,
  createChangeRequest,
  getChangeRequestDetail,
  updateChangeRequest,
  submitChangeRequest,
  approveChangeRequest,
  rejectChangeRequest,
  implementChangeRequest,
  cancelChangeRequest,
  linkTask,
  unlinkTask,
  linkRisk,
  unlinkRisk,
} from '@/features/change-requests/changeRequests.api';
import { listTasks } from '@/features/work-management/workTasks.api';
import {
  listDocuments,
  linkDocument,
  type DocumentItem,
  formatFileSize,
} from '@/features/documents/documents.api';
import { InlineLoadingState, EmptyStateCard } from '@/components/ui/states';

// ─── Constants ──────────────────────────────────────────────

const CR_TYPES: ChangeRequestType[] = [
  'SCOPE', 'SCHEDULE', 'COST', 'RESOURCE', 'RISK', 'QUALITY', 'PROCUREMENT', 'OTHER',
];

const STATUS_COLORS: Record<ChangeRequestStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  IMPLEMENTED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const STATUS_ICONS: Record<ChangeRequestStatus, React.ReactNode> = {
  DRAFT: <Clock className="h-3.5 w-3.5" />,
  SUBMITTED: <Send className="h-3.5 w-3.5" />,
  APPROVED: <CheckCircle2 className="h-3.5 w-3.5" />,
  REJECTED: <XCircle className="h-3.5 w-3.5" />,
  IMPLEMENTED: <Rocket className="h-3.5 w-3.5" />,
  CANCELLED: <Ban className="h-3.5 w-3.5" />,
};

// ─── Component ──────────────────────────────────────────────

export const ProjectChangeTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { user } = useAuth();

  const isAdmin = isAdminUser(user);
  const isGuest = isGuestUser(user);
  const canCreate = !isGuest;

  const [items, setItems] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ChangeRequestDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ─── List ─────────────────────────────────────────────────

  const loadList = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await listChangeRequests(projectId);
      setItems(res.items);
    } catch (err: any) {
      setError(err?.message || 'Failed to load change requests');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadList(); }, [loadList]);

  // ─── Detail ───────────────────────────────────────────────

  const loadDetail = useCallback(async (id: string) => {
    try {
      setDetailLoading(true);
      const d = await getChangeRequestDetail(id);
      setDetail(d);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load detail');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openDetail = (id: string) => {
    setSelectedId(id);
    loadDetail(id);
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
  };

  // ─── Actions ──────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!detail) return;
    try {
      await submitChangeRequest(detail.id);
      toast.success('Change request submitted');
      loadDetail(detail.id);
      loadList();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  const handleApprove = async () => {
    if (!detail) return;
    try {
      await approveChangeRequest(detail.id);
      toast.success('Change request approved');
      loadDetail(detail.id);
      loadList();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  const handleReject = async () => {
    if (!detail) return;
    try {
      await rejectChangeRequest(detail.id);
      toast.success('Change request rejected');
      loadDetail(detail.id);
      loadList();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  const handleImplement = async () => {
    if (!detail) return;
    try {
      await implementChangeRequest(detail.id);
      toast.success('Change request implemented');
      loadDetail(detail.id);
      loadList();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  const handleCancel = async () => {
    if (!detail) return;
    try {
      await cancelChangeRequest(detail.id);
      toast.success('Change request cancelled');
      loadDetail(detail.id);
      loadList();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  // ─── Link Task ────────────────────────────────────────────

  const [linkingTask, setLinkingTask] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<{ id: string; title: string }[]>([]);

  const startLinkTask = async () => {
    if (!projectId || !detail) return;
    try {
      const res = await listTasks({ projectId, limit: 100 });
      const linked = new Set(detail.linkedTasks.map((t) => t.id));
      setAvailableTasks(
        res.items
          .filter((t: { id: string }) => !linked.has(t.id))
          .map((t: { id: string; title: string }) => ({ id: t.id, title: t.title })),
      );
      setLinkingTask(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load tasks');
    }
  };

  const doLinkTask = async (taskId: string) => {
    if (!detail) return;
    try {
      await linkTask(detail.id, taskId);
      toast.success('Task linked');
      setLinkingTask(false);
      loadDetail(detail.id);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to link task');
    }
  };

  const doUnlinkTask = async (taskId: string) => {
    if (!detail) return;
    try {
      await unlinkTask(detail.id, taskId);
      toast.success('Task unlinked');
      loadDetail(detail.id);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to unlink');
    }
  };

  // ─── Link Risk ────────────────────────────────────────────

  const doUnlinkRisk = async (riskId: string) => {
    if (!detail) return;
    try {
      await unlinkRisk(detail.id, riskId);
      toast.success('Risk unlinked');
      loadDetail(detail.id);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to unlink');
    }
  };

  // ─── Documents on CR ──────────────────────────────────────

  const [crDocs, setCrDocs] = useState<DocumentItem[]>([]);
  const [linkingDoc, setLinkingDoc] = useState(false);
  const [allProjectDocs, setAllProjectDocs] = useState<DocumentItem[]>([]);

  const loadCrDocs = async (crId: string) => {
    if (!projectId) return;
    try {
      const res = await listDocuments(projectId, { changeRequestId: crId });
      setCrDocs(res.items);
    } catch { /* ignore */ }
  };

  // Reload docs when detail loads
  useEffect(() => {
    if (detail?.id) loadCrDocs(detail.id);
    else setCrDocs([]);
  }, [detail?.id]);

  const startLinkDoc = async () => {
    if (!projectId || !detail) return;
    try {
      const res = await listDocuments(projectId);
      const linked = new Set(crDocs.map((d) => d.id));
      setAllProjectDocs(res.items.filter((d) => !linked.has(d.id)));
      setLinkingDoc(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load documents');
    }
  };

  const doLinkDoc = async (docId: string) => {
    if (!detail) return;
    try {
      await linkDocument(docId, detail.id);
      toast.success('Document linked');
      setLinkingDoc(false);
      loadCrDocs(detail.id);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to link document');
    }
  };

  // ─── Render ───────────────────────────────────────────────

  if (!projectId || !activeWorkspaceId) {
    return <div className="p-6 text-slate-500">No project selected.</div>;
  }

  return (
    <div data-testid="change-requests-root">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Change Requests</h2>
          <span className="text-sm text-slate-400">({items.length})</span>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            data-testid="cr-create-btn"
          >
            <Plus className="h-4 w-4" /> New Change Request
          </button>
        )}
      </div>

      {/* Loading / Error */}
      {loading && <InlineLoadingState message="Loading changes..." />}
      {error && <div className="text-red-600 text-sm mb-4">{error}</div>}

      {/* List Table */}
      {!loading && items.length === 0 && (
        <EmptyStateCard
          title="No change requests"
          description="Track project changes and their approval status here."
          variant="default"
          icon={FileText}
        />
      )}
      {!loading && items.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden" data-testid="cr-list">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2 text-slate-600 font-medium">Title</th>
                <th className="text-left px-4 py-2 text-slate-600 font-medium">Type</th>
                <th className="text-left px-4 py-2 text-slate-600 font-medium">Status</th>
                <th className="text-left px-4 py-2 text-slate-600 font-medium">Updated</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((cr) => (
                <tr
                  key={cr.id}
                  className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                  onClick={() => openDetail(cr.id)}
                  data-testid="cr-row"
                >
                  <td className="px-4 py-2 font-medium text-slate-900">{cr.title}</td>
                  <td className="px-4 py-2 text-slate-600">{cr.type}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[cr.status]}`}>
                      {STATUS_ICONS[cr.status]}
                      {cr.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{new Date(cr.updatedAt).toLocaleDateString()}</td>
                  <td className="px-2"><ChevronRight className="h-4 w-4 text-slate-400" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Detail Panel ────────────────────────────────────── */}
      {selectedId && detail && (
        <div className="fixed inset-0 z-50 flex justify-end" data-testid="cr-detail-panel">
          <div className="absolute inset-0 bg-black/20" onClick={closeDetail} />
          <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900" data-testid="cr-detail-title">{detail.title}</h3>
                <button onClick={closeDetail} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
              </div>

              {/* Status badge */}
              <div className="mb-4">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[detail.status]}`}>
                  {STATUS_ICONS[detail.status]}
                  {detail.status}
                </span>
              </div>

              {/* Fields */}
              <div className="space-y-3 text-sm">
                <div><span className="text-slate-500">Type:</span> <span className="font-medium">{detail.type}</span></div>
                {detail.description && <div><span className="text-slate-500">Description:</span> <p className="mt-1 text-slate-700">{detail.description}</p></div>}
                {detail.dueDate && <div><span className="text-slate-500">Due:</span> {new Date(detail.dueDate).toLocaleDateString()}</div>}
                {detail.scopeImpact && <div><span className="text-slate-500">Scope Impact:</span> <p className="mt-1 text-slate-600">{detail.scopeImpact}</p></div>}
                {detail.scheduleImpactDays != null && <div><span className="text-slate-500">Schedule Impact:</span> {detail.scheduleImpactDays} days</div>}
                {detail.costImpactAmount != null && <div><span className="text-slate-500">Cost Impact:</span> ${Number(detail.costImpactAmount).toLocaleString()}</div>}
                {detail.riskImpact && <div><span className="text-slate-500">Risk Impact:</span> <p className="mt-1 text-slate-600">{detail.riskImpact}</p></div>}
              </div>

              {/* Linked Tasks */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="h-4 w-4 text-slate-500" />
                  <h4 className="text-sm font-semibold text-slate-700">Linked Tasks ({detail.linkedTasks.length})</h4>
                  {(detail.status === 'DRAFT' || detail.status === 'SUBMITTED') && !isGuest && (
                    <button onClick={startLinkTask} className="text-xs text-indigo-600 hover:text-indigo-800" data-testid="cr-link-task-btn">+ Link Task</button>
                  )}
                </div>
                {detail.linkedTasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-slate-700">{t.title} <span className="text-slate-400 text-xs">({t.status})</span></span>
                    {(detail.status === 'DRAFT' || detail.status === 'SUBMITTED') && !isGuest && (
                      <button onClick={() => doUnlinkTask(t.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    )}
                  </div>
                ))}
                {linkingTask && (
                  <div className="mt-2 bg-slate-50 rounded p-2 border" data-testid="cr-task-picker">
                    <p className="text-xs text-slate-500 mb-1">Select a task to link:</p>
                    {availableTasks.length === 0 && <p className="text-xs text-slate-400">No available tasks</p>}
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {availableTasks.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => doLinkTask(t.id)}
                          className="block w-full text-left text-xs px-2 py-1 rounded hover:bg-indigo-50 text-slate-700"
                        >
                          {t.title}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setLinkingTask(false)} className="text-xs text-slate-500 mt-1 hover:text-slate-700">Cancel</button>
                  </div>
                )}
              </div>

              {/* Linked Risks */}
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-slate-500" />
                  <h4 className="text-sm font-semibold text-slate-700">Linked Risks ({detail.linkedRisks.length})</h4>
                </div>
                {detail.linkedRisks.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-slate-700">{r.title} <span className="text-slate-400 text-xs">({r.severity})</span></span>
                    {(detail.status === 'DRAFT' || detail.status === 'SUBMITTED') && !isGuest && (
                      <button onClick={() => doUnlinkRisk(r.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    )}
                  </div>
                ))}
              </div>

              {/* Linked Documents */}
              <div className="mt-4" data-testid="cr-documents-section">
                <div className="flex items-center gap-2 mb-2">
                  <Paperclip className="h-4 w-4 text-slate-500" />
                  <h4 className="text-sm font-semibold text-slate-700">Documents ({crDocs.length})</h4>
                  {(detail.status === 'DRAFT' || detail.status === 'SUBMITTED') && !isGuest && (
                    <button onClick={startLinkDoc} className="text-xs text-indigo-600 hover:text-indigo-800" data-testid="cr-link-doc-btn">+ Link Document</button>
                  )}
                </div>
                {crDocs.map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-slate-700 truncate max-w-[250px]">{d.title} <span className="text-slate-400 text-xs">({formatFileSize(d.sizeBytes)})</span></span>
                  </div>
                ))}
                {crDocs.length === 0 && <p className="text-xs text-slate-400">No documents linked</p>}
                {linkingDoc && (
                  <div className="mt-2 bg-slate-50 rounded p-2 border" data-testid="cr-doc-picker">
                    <p className="text-xs text-slate-500 mb-1">Select a document to link:</p>
                    {allProjectDocs.length === 0 && <p className="text-xs text-slate-400">No available documents. Upload one in the Documents tab first.</p>}
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {allProjectDocs.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => doLinkDoc(d.id)}
                          className="block w-full text-left text-xs px-2 py-1 rounded hover:bg-indigo-50 text-slate-700"
                        >
                          {d.title} ({formatFileSize(d.sizeBytes)})
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setLinkingDoc(false)} className="text-xs text-slate-500 mt-1 hover:text-slate-700">Cancel</button>
                  </div>
                )}
              </div>

              {/* Status Actions */}
              <div className="mt-6 flex flex-wrap gap-2" data-testid="cr-actions">
                {detail.status === 'DRAFT' && !isGuest && (
                  <button onClick={handleSubmit} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700" data-testid="cr-submit-btn">
                    <Send className="h-3.5 w-3.5" /> Submit
                  </button>
                )}
                {detail.status === 'SUBMITTED' && isAdmin && (
                  <>
                    <button onClick={handleApprove} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700" data-testid="cr-approve-btn">
                      <ThumbsUp className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button onClick={handleReject} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700" data-testid="cr-reject-btn">
                      <ThumbsDown className="h-3.5 w-3.5" /> Reject
                    </button>
                  </>
                )}
                {detail.status === 'APPROVED' && isAdmin && (
                  <>
                    <button onClick={handleImplement} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded hover:bg-emerald-700">
                      <Rocket className="h-3.5 w-3.5" /> Implement
                    </button>
                    <button onClick={handleCancel} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200">
                      <Ban className="h-3.5 w-3.5" /> Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Create Modal ────────────────────────────────────── */}
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

// ─── Create Modal ───────────────────────────────────────────

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
  const [type, setType] = useState<ChangeRequestType>('SCOPE');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    try {
      setSaving(true);
      await createChangeRequest(projectId, {
        title: title.trim(),
        type,
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
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">New Change Request</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Change request title"
              data-testid="cr-title-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ChangeRequestType)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              data-testid="cr-type-select"
            >
              {CR_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              placeholder="Optional description"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
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
