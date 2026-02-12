/**
 * Phase Gate side panel for viewing and managing gate definition + submissions.
 * Opened from the gate badge in the Plan tab.
 */
import { useState, useEffect, useCallback } from 'react';
import { X, Shield, CheckCircle2, XCircle, Clock, Upload, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getGateDefinition,
  upsertGateDefinition,
  listGateSubmissions,
  createDraftSubmission,
  submitGateSubmission,
  approveGateSubmission,
  rejectGateSubmission,
  cancelGateSubmission,
  getApprovalChain,
  createApprovalChain,
  deleteApprovalChain,
  getApprovalState,
  approveApprovalStep,
  rejectApprovalStep,
  type GateDefinition,
  type GateSubmission,
  type UpsertGatePayload,
  type GateSubmissionStatus,
  type ApprovalChain,
  type ChainExecutionState,
  type StepApprovalState,
  type CreateChainPayload,
  type ApprovalType,
} from './phaseGates.api';
import { listDocuments, type DocumentItem } from '@/features/documents/documents.api';

interface PhaseGatePanelProps {
  projectId: string;
  phaseId: string;
  phaseName: string;
  isAdmin: boolean;
  onClose: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export function PhaseGatePanel({
  projectId,
  phaseId,
  phaseName,
  isAdmin,
  onClose,
}: PhaseGatePanelProps) {
  const [definition, setDefinition] = useState<GateDefinition | null>(null);
  const [submissions, setSubmissions] = useState<GateSubmission[]>([]);
  const [projectDocs, setProjectDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Definition editor state
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editChecklist, setEditChecklist] = useState<string[]>([]);
  const [editDocCount, setEditDocCount] = useState<number>(0);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editThresholds, setEditThresholds] = useState<Array<{ key: string; value: string }>>([]);
  const [editEnabled, setEditEnabled] = useState(true);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newThresholdKey, setNewThresholdKey] = useState('');
  const [newThresholdValue, setNewThresholdValue] = useState('');

  // Submission state
  const [draftSubmission, setDraftSubmission] = useState<GateSubmission | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [checklistAnswers, setChecklistAnswers] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [decisionNote, setDecisionNote] = useState('');
  const [softWarnings, setSoftWarnings] = useState<string[]>([]);
  const [confirmWarningsChecked, setConfirmWarningsChecked] = useState(false);

  // Sprint 10: Approval chain state
  const [approvalChain, setApprovalChain] = useState<ApprovalChain | null>(null);
  const [chainExecutionState, setChainExecutionState] = useState<ChainExecutionState | null>(null);
  const [chainEditorOpen, setChainEditorOpen] = useState(false);
  const [chainName, setChainName] = useState('');
  const [chainSteps, setChainSteps] = useState<Array<{
    name: string;
    requiredRole: string;
    approvalType: ApprovalType;
    minApprovals: number;
  }>>([]);
  const [approvalNote, setApprovalNote] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [def, subs, docs] = await Promise.all([
        getGateDefinition(projectId, phaseId),
        listGateSubmissions(projectId, { phaseId }),
        listDocuments(projectId, {}),
      ]);
      setDefinition(def);
      setSubmissions(subs?.items || []);
      setProjectDocs(docs?.items || []);

      if (def) {
        setEditName(def.name);
        setEditChecklist(def.requiredChecklist?.items || []);
        setEditDocCount(def.requiredDocuments?.requiredCount || 0);
        setEditTags(def.requiredDocuments?.requiredTags || []);
        setEditEnabled(def.status === 'ACTIVE');
        const th = def.thresholds || {};
        setEditThresholds(
          Object.entries(th).map(([key, value]) => ({ key, value: String(value) })),
        );
      }

      // Load approval chain if definition exists
      if (def) {
        try {
          const chain = await getApprovalChain(def.id);
          setApprovalChain(chain);
          if (chain) {
            setChainName(chain.name);
            setChainSteps(
              chain.steps.map((s) => ({
                name: s.name,
                requiredRole: s.requiredRole || '',
                approvalType: s.approvalType,
                minApprovals: s.minApprovals,
              })),
            );
          }
        } catch {
          // Fail-open: chain not required
        }
      }

      // Check for existing open draft/submitted
      const open = (subs?.items || []).find(
        (s: GateSubmission) => s.status === 'DRAFT' || s.status === 'SUBMITTED',
      );
      setDraftSubmission(open || null);

      // Load chain execution state for active submission
      if (open && open.status === 'SUBMITTED') {
        try {
          const state = await getApprovalState(open.id);
          setChainExecutionState(state);
        } catch {
          // Fail-open
        }
      } else {
        setChainExecutionState(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load gate data';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId, phaseId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Save definition ─────────────────────────────────────

  const handleSaveDefinition = async () => {
    if (!editName.trim()) {
      toast.error('Gate name is required');
      return;
    }
    setSaving(true);
    try {
      const payload: UpsertGatePayload = {
        name: editName.trim(),
        requiredDocuments: {
          requiredCount: editDocCount || undefined,
          requiredTags: editTags.length ? editTags : undefined,
        },
        requiredChecklist: editChecklist.length ? { items: editChecklist } : undefined,
        thresholds: editThresholds.length
          ? editThresholds.reduce(
              (acc, t) => ({ ...acc, [t.key]: t.value }),
              {} as Record<string, unknown>,
            )
          : undefined,
        status: editEnabled ? 'ACTIVE' : 'DISABLED',
      };
      const saved = await upsertGateDefinition(projectId, phaseId, payload);
      setDefinition(saved);
      setEditMode(false);
      toast.success('Gate definition saved');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save gate';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Create draft ─────────────────────────────────────────

  const handleCreateDraft = async () => {
    try {
      const draft = await createDraftSubmission(projectId, phaseId);
      setDraftSubmission(draft);
      setSelectedDocIds(new Set());
      setChecklistAnswers(new Set());
      toast.success('Draft created');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create draft';
      toast.error(msg);
    }
  };

  // ─── Submit ───────────────────────────────────────────────

  const handleSubmit = async (withConfirm = false) => {
    if (!draftSubmission) return;
    setSubmitting(true);
    try {
      await submitGateSubmission(draftSubmission.id, {
        checklistAnswers: Array.from(checklistAnswers),
        documentIds: Array.from(selectedDocIds),
        confirmWarnings: withConfirm || undefined,
      });
      toast.success('Gate submitted for approval');
      setSoftWarnings([]);
      setConfirmWarningsChecked(false);
      loadData();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { code?: string; message?: string; warnings?: string[] } } };
      const code = errObj?.response?.data?.code;
      const msg = errObj?.response?.data?.message || 'Submission failed';
      if (code === 'GATE_WARNINGS_CONFIRM_REQUIRED') {
        // SOFT mode — show warnings to user
        setSoftWarnings(errObj?.response?.data?.warnings || [msg]);
        toast.info('Requirements not met. Confirm warnings to proceed.');
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Approve / Reject / Cancel ────────────────────────────

  const handleApprove = async (id: string) => {
    try {
      await approveGateSubmission(id, { decisionNote: decisionNote || undefined });
      toast.success('Gate approved');
      setDecisionNote('');
      loadData();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      toast.error(errObj?.response?.data?.message || 'Approve failed');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectGateSubmission(id, { decisionNote: decisionNote || undefined });
      toast.success('Gate rejected');
      setDecisionNote('');
      loadData();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      toast.error(errObj?.response?.data?.message || 'Reject failed');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelGateSubmission(id);
      toast.success('Submission cancelled');
      loadData();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      toast.error(errObj?.response?.data?.message || 'Cancel failed');
    }
  };

  // ─── Sprint 10: Approval chain actions ──────────────────

  const handleSaveChain = async () => {
    if (!definition || !chainName.trim() || chainSteps.length === 0) {
      toast.error('Chain requires a name and at least one step');
      return;
    }
    setSaving(true);
    try {
      const payload: CreateChainPayload = {
        gateDefinitionId: definition.id,
        name: chainName.trim(),
        steps: chainSteps
          .filter((s) => s.name.trim() && s.requiredRole.trim())
          .map((s) => ({
            name: s.name.trim(),
            requiredRole: s.requiredRole.trim(),
            approvalType: s.approvalType,
            minApprovals: s.minApprovals,
          })),
      };
      const chain = await createApprovalChain(payload);
      setApprovalChain(chain);
      setChainEditorOpen(false);
      toast.success('Approval chain saved');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save chain';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChain = async () => {
    if (!approvalChain) return;
    try {
      await deleteApprovalChain(approvalChain.id);
      setApprovalChain(null);
      setChainSteps([]);
      setChainName('');
      toast.success('Approval chain removed');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete chain';
      toast.error(msg);
    }
  };

  const handleApproveStep = async (submissionId: string) => {
    try {
      const state = await approveApprovalStep(submissionId, approvalNote || undefined);
      setChainExecutionState(state);
      setApprovalNote('');
      toast.success('Step approved');
      loadData();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      toast.error(errObj?.response?.data?.message || 'Approve failed');
    }
  };

  const handleRejectStep = async (submissionId: string) => {
    try {
      const state = await rejectApprovalStep(submissionId, approvalNote || undefined);
      setChainExecutionState(state);
      setApprovalNote('');
      toast.success('Step rejected');
      loadData();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      toast.error(errObj?.response?.data?.message || 'Reject failed');
    }
  };

  const addChainStep = () => {
    setChainSteps([
      ...chainSteps,
      { name: '', requiredRole: 'ADMIN', approvalType: 'ANY_ONE', minApprovals: 1 },
    ]);
  };

  const removeChainStep = (index: number) => {
    setChainSteps(chainSteps.filter((_, i) => i !== index));
  };

  const moveChainStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...chainSteps];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newSteps.length) return;
    [newSteps[index], newSteps[targetIdx]] = [newSteps[targetIdx], newSteps[index]];
    setChainSteps(newSteps);
  };

  // ─── Render ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="fixed inset-y-0 right-0 w-[460px] bg-white border-l border-gray-200 shadow-xl z-50 flex items-center justify-center">
        <span className="text-gray-500">Loading gate data...</span>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[460px] bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Gate: {phaseName}</h2>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-200">
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* ─── Gate Definition Section ─── */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Gate Definition
            </h3>
            {isAdmin && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="text-xs text-indigo-600 hover:text-indigo-800"
              >
                {definition ? 'Edit' : 'Configure'}
              </button>
            )}
          </div>

          {editMode ? (
            <div className="space-y-3 bg-gray-50 rounded-lg p-3">
              {/* Name */}
              <div>
                <label className="text-xs font-medium text-gray-600">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1"
                  placeholder="Gate name"
                />
              </div>

              {/* Enable/Disable */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editEnabled}
                  onChange={(e) => setEditEnabled(e.target.checked)}
                />
                Enabled
              </label>

              {/* Required documents count */}
              <div>
                <label className="text-xs font-medium text-gray-600">Required documents count</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={editDocCount}
                  onChange={(e) => setEditDocCount(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1"
                />
              </div>

              {/* Required tags */}
              <div>
                <label className="text-xs font-medium text-gray-600">Required tags</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {editTags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-gray-200 text-xs px-2 py-0.5 rounded-full">
                      {tag}
                      <button onClick={() => setEditTags(editTags.filter((_, j) => j !== i))} className="text-gray-500 hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1 mt-1">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag"
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTag.trim()) {
                        setEditTags([...editTags, newTag.trim()]);
                        setNewTag('');
                      }
                    }}
                  />
                  <button
                    onClick={() => { if (newTag.trim()) { setEditTags([...editTags, newTag.trim()]); setNewTag(''); } }}
                    className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Checklist items */}
              <div>
                <label className="text-xs font-medium text-gray-600">Required checklist items</label>
                <ul className="mt-1 space-y-1">
                  {editChecklist.map((item, i) => (
                    <li key={i} className="flex items-center gap-1 text-sm">
                      <span className="flex-1">{item}</span>
                      <button
                        onClick={() => setEditChecklist(editChecklist.filter((_, j) => j !== i))}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-1 mt-1">
                  <input
                    type="text"
                    value={newCheckItem}
                    onChange={(e) => setNewCheckItem(e.target.value)}
                    placeholder="Add checklist item"
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newCheckItem.trim()) {
                        setEditChecklist([...editChecklist, newCheckItem.trim()]);
                        setNewCheckItem('');
                      }
                    }}
                  />
                  <button
                    onClick={() => { if (newCheckItem.trim()) { setEditChecklist([...editChecklist, newCheckItem.trim()]); setNewCheckItem(''); } }}
                    className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Thresholds */}
              <div>
                <label className="text-xs font-medium text-gray-600">Thresholds (key-value)</label>
                <ul className="mt-1 space-y-1">
                  {editThresholds.map((t, i) => (
                    <li key={i} className="flex items-center gap-1 text-sm">
                      <span className="font-mono text-xs">{t.key}: {t.value}</span>
                      <button
                        onClick={() => setEditThresholds(editThresholds.filter((_, j) => j !== i))}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-1 mt-1">
                  <input
                    type="text"
                    value={newThresholdKey}
                    onChange={(e) => setNewThresholdKey(e.target.value)}
                    placeholder="Key"
                    className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                  <input
                    type="text"
                    value={newThresholdValue}
                    onChange={(e) => setNewThresholdValue(e.target.value)}
                    placeholder="Value"
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => {
                      if (newThresholdKey.trim() && newThresholdValue.trim()) {
                        setEditThresholds([...editThresholds, { key: newThresholdKey.trim(), value: newThresholdValue.trim() }]);
                        setNewThresholdKey('');
                        setNewThresholdValue('');
                      }
                    }}
                    className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Save / Cancel */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveDefinition}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : definition ? (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{definition.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${definition.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                  {definition.status}
                </span>
                {(definition as GateDefinition & { enforcementMode?: string }).enforcementMode && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    (definition as GateDefinition & { enforcementMode?: string }).enforcementMode === 'HARD'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {(definition as GateDefinition & { enforcementMode?: string }).enforcementMode}
                  </span>
                )}
              </div>
              {definition.requiredChecklist?.items?.length ? (
                <div>
                  <span className="text-xs text-gray-500">Checklist ({definition.requiredChecklist.items.length} items)</span>
                  <ul className="list-disc list-inside text-xs text-gray-600 ml-2">
                    {definition.requiredChecklist.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {definition.requiredDocuments?.requiredCount ? (
                <div className="text-xs text-gray-600">
                  Required docs: {definition.requiredDocuments.requiredCount}
                  {definition.requiredDocuments?.requiredTags?.length
                    ? ` (tags: ${definition.requiredDocuments.requiredTags.join(', ')})`
                    : ''}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No gate configured for this phase.</p>
          )}
        </section>

        {/* ─── Sprint 10: Approval Chain Section ─── */}
        {definition && definition.status === 'ACTIVE' && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Approval Chain
              </h3>
              {isAdmin && !chainEditorOpen && (
                <button
                  onClick={() => setChainEditorOpen(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  {approvalChain ? 'Edit Chain' : 'Configure Chain'}
                </button>
              )}
            </div>

            {chainEditorOpen ? (
              <div className="space-y-3 bg-gray-50 rounded-lg p-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Chain Name</label>
                  <input
                    type="text"
                    value={chainName}
                    onChange={(e) => setChainName(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1"
                    placeholder="e.g. PMO + Finance Approval"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Steps (in order)</label>
                  <div className="space-y-2 mt-1">
                    {chainSteps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2 border border-gray-200 rounded p-2 bg-white">
                        <span className="text-xs text-gray-400 mt-2">{i + 1}.</span>
                        <div className="flex-1 space-y-1">
                          <input
                            type="text"
                            value={step.name}
                            onChange={(e) => {
                              const n = [...chainSteps];
                              n[i] = { ...n[i], name: e.target.value };
                              setChainSteps(n);
                            }}
                            placeholder="Step name"
                            className="w-full border border-gray-200 rounded px-2 py-0.5 text-sm"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={step.requiredRole}
                              onChange={(e) => {
                                const n = [...chainSteps];
                                n[i] = { ...n[i], requiredRole: e.target.value };
                                setChainSteps(n);
                              }}
                              placeholder="Role (e.g. ADMIN)"
                              className="flex-1 border border-gray-200 rounded px-2 py-0.5 text-xs"
                            />
                            <select
                              value={step.approvalType}
                              onChange={(e) => {
                                const n = [...chainSteps];
                                n[i] = { ...n[i], approvalType: e.target.value as ApprovalType };
                                setChainSteps(n);
                              }}
                              className="border border-gray-200 rounded px-1 py-0.5 text-xs"
                            >
                              <option value="ANY_ONE">Any One</option>
                              <option value="ALL">All</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => moveChainStep(i, 'up')} disabled={i === 0} className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30">▲</button>
                          <button onClick={() => moveChainStep(i, 'down')} disabled={i === chainSteps.length - 1} className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30">▼</button>
                          <button onClick={() => removeChainStep(i)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addChainStep}
                    className="mt-2 text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    + Add Step
                  </button>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveChain}
                    disabled={saving}
                    className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Chain'}
                  </button>
                  <button
                    onClick={() => setChainEditorOpen(false)}
                    className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  {approvalChain && (
                    <button
                      onClick={handleDeleteChain}
                      className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800"
                    >
                      Remove Chain
                    </button>
                  )}
                </div>
              </div>
            ) : approvalChain ? (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{approvalChain.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-800">
                    {approvalChain.steps.length} step{approvalChain.steps.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <ol className="space-y-1">
                  {approvalChain.steps.map((step, i) => (
                    <li key={step.id} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium">{i + 1}</span>
                      <span>{step.name}</span>
                      <span className="text-gray-400">({step.requiredRole || 'User'}, {step.approvalType === 'ANY_ONE' ? 'Any one' : `All (min ${step.minApprovals})`})</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No approval chain configured. Single-step approval will be used.</p>
            )}

            {/* Chain execution state for active submission */}
            {chainExecutionState && (
              <div className="mt-3 border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-gray-700">Chain Progress</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    chainExecutionState.chainStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    chainExecutionState.chainStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    chainExecutionState.chainStatus === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {chainExecutionState.chainStatus}
                  </span>
                </div>
                <ol className="space-y-1.5">
                  {chainExecutionState.steps.map((step: StepApprovalState) => (
                    <li key={step.stepId} className="flex items-center gap-2 text-xs">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium ${
                        step.status === 'APPROVED' ? 'bg-green-200 text-green-800' :
                        step.status === 'REJECTED' ? 'bg-red-200 text-red-800' :
                        step.status === 'ACTIVE' ? 'bg-blue-200 text-blue-800' :
                        'bg-gray-200 text-gray-500'
                      }`}>
                        {step.status === 'APPROVED' ? '✓' : step.status === 'REJECTED' ? '✕' : step.stepOrder}
                      </span>
                      <span className={step.status === 'ACTIVE' ? 'font-medium text-gray-900' : 'text-gray-600'}>
                        {step.name}
                      </span>
                      {step.status === 'ACTIVE' && step.stepId === chainExecutionState.activeStepId && (
                        <span className="text-blue-600 text-[10px]">← your action</span>
                      )}
                    </li>
                  ))}
                </ol>

                {/* Approve/Reject for active step */}
                {chainExecutionState.chainStatus === 'IN_PROGRESS' && chainExecutionState.activeStepId && (
                  <div className="pt-2 space-y-2 border-t border-gray-200">
                    <input
                      type="text"
                      value={approvalNote}
                      onChange={(e) => setApprovalNote(e.target.value)}
                      placeholder="Note (optional)"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => draftSubmission && handleApproveStep(draftSubmission.id)}
                        className="flex items-center gap-1 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Approve Step
                      </button>
                      <button
                        onClick={() => draftSubmission && handleRejectStep(draftSubmission.id)}
                        className="flex items-center gap-1 px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        <XCircle className="h-3 w-3" /> Reject Step
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ─── Submissions Section ─── */}
        {definition && definition.status === 'ACTIVE' && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Submissions
            </h3>

            {/* Existing submissions list */}
            {submissions.length > 0 && (
              <div className="space-y-2 mb-3">
                {submissions.map((sub) => (
                  <div key={sub.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[sub.status] || ''}`}>
                        {sub.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : new Date(sub.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {sub.decisionNote && (
                      <p className="text-xs text-gray-600 italic">Note: {sub.decisionNote}</p>
                    )}

                    {/* Actions for SUBMITTED submissions */}
                    {sub.status === 'SUBMITTED' && isAdmin && (
                      <div className="space-y-2 pt-1">
                        <input
                          type="text"
                          value={decisionNote}
                          onChange={(e) => setDecisionNote(e.target.value)}
                          placeholder="Decision note (optional)"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(sub.id)}
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(sub.id)}
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            <XCircle className="h-3 w-3" /> Reject
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Cancel option for DRAFT or SUBMITTED */}
                    {(sub.status === 'DRAFT' || sub.status === 'SUBMITTED') && (
                      <button
                        onClick={() => handleCancel(sub.id)}
                        className="text-xs text-gray-500 hover:text-red-600"
                      >
                        Cancel submission
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Create draft or work on existing draft */}
            {!draftSubmission ? (
              <button
                onClick={handleCreateDraft}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" /> Create Draft Submission
              </button>
            ) : draftSubmission.status === 'DRAFT' ? (
              <div className="border border-indigo-200 rounded-lg p-3 bg-indigo-50 space-y-3">
                <h4 className="text-sm font-semibold text-indigo-800">
                  Draft Submission
                </h4>

                {/* Checklist completion */}
                {definition.requiredChecklist?.items?.length ? (
                  <div>
                    <span className="text-xs font-medium text-gray-600">Checklist</span>
                    <ul className="mt-1 space-y-1">
                      {definition.requiredChecklist.items.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checklistAnswers.has(item)}
                            onChange={(e) => {
                              const next = new Set(checklistAnswers);
                              e.target.checked ? next.add(item) : next.delete(item);
                              setChecklistAnswers(next);
                            }}
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* Document picker */}
                {(definition.requiredDocuments?.requiredCount || 0) > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">
                      Select documents (min {definition.requiredDocuments?.requiredCount})
                    </span>
                    {projectDocs.length > 0 ? (
                      <ul className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                        {projectDocs.map((doc) => (
                          <li key={doc.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={selectedDocIds.has(doc.id)}
                              onChange={(e) => {
                                const next = new Set(selectedDocIds);
                                e.target.checked ? next.add(doc.id) : next.delete(doc.id);
                                setSelectedDocIds(next);
                              }}
                            />
                            <span className="truncate">{doc.title || doc.fileName}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">
                        No documents available. Upload documents in the Docs tab first.
                      </p>
                    )}
                  </div>
                )}

                {/* Soft warnings */}
                {softWarnings.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3 space-y-2">
                    <p className="text-xs font-medium text-amber-800">Warnings (SOFT enforcement):</p>
                    <ul className="text-xs text-amber-700 list-disc ml-4">
                      {softWarnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                    <label className="flex items-center gap-2 text-xs text-amber-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmWarningsChecked}
                        onChange={e => setConfirmWarningsChecked(e.target.checked)}
                      />
                      I acknowledge these warnings and want to proceed
                    </label>
                  </div>
                )}

                {/* Submit button */}
                <button
                  onClick={() => handleSubmit(confirmWarningsChecked && softWarnings.length > 0)}
                  disabled={submitting || (softWarnings.length > 0 && !confirmWarningsChecked)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : softWarnings.length > 0 ? 'Confirm & Submit' : 'Submit for Approval'}
                </button>
              </div>
            ) : null}
          </section>
        )}
      </div>
    </div>
  );
}
