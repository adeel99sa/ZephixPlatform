/**
 * ProjectDocumentWorkflowTab — Template Center document lifecycle within a project.
 * Lists required DocumentInstances, shows status, allows role-based transitions,
 * and shows version history.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { isAdminRole } from '@/utils/roles';
import { toast } from 'sonner';
import {
  FileText,
  ChevronDown,
  ChevronRight,
  Clock,
  Shield,
  CheckCircle2,
  AlertCircle,
  PenLine,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { InlineLoadingState, EmptyStateCard } from '@/components/ui/states';
import {
  listProjectDocumentWorkflow,
  getDocumentHistory,
  transitionDocument,
  ALLOWED_TRANSITIONS,
  ACTION_LABELS,
  STATUS_LABELS,
  type DocumentInstanceSummary,
  type DocumentHistoryItem,
  type DocumentStatus,
  type DocumentAction,
} from '@/features/documents/documentWorkflow.api';

/* ─── Status display ──────────────────────────────────────── */

const STATUS_STYLES: Record<
  DocumentStatus,
  { bg: string; text: string; icon: React.ElementType }
> = {
  not_started: { bg: 'bg-slate-100', text: 'text-slate-600', icon: Clock },
  draft: { bg: 'bg-amber-50', text: 'text-amber-700', icon: PenLine },
  in_review: { bg: 'bg-blue-50', text: 'text-blue-700', icon: Eye },
  approved: { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle2 },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2 },
  superseded: { bg: 'bg-slate-100', text: 'text-slate-500', icon: RotateCcw },
};

function StatusPill({ status }: { status: DocumentStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.not_started;
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}
    >
      <Icon className="h-3 w-3" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

/* ─── Action button styles ─────────────────────────────────── */

const ACTION_VARIANTS: Record<string, string> = {
  approve: 'bg-green-600 hover:bg-green-700 text-white',
  mark_complete: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  submit_for_review: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  start_draft: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  request_changes: 'bg-amber-600 hover:bg-amber-700 text-white',
  create_new_version: 'bg-slate-600 hover:bg-slate-700 text-white',
};

/* ─── Document Row ────────────────────────────────────────── */

interface DocRowProps {
  doc: DocumentInstanceSummary;
  projectId: string;
  isAdmin: boolean;
  userId: string;
  onTransition: () => void;
}

const DocumentRow: React.FC<DocRowProps> = ({
  doc,
  projectId,
  isAdmin,
  userId,
  onTransition,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<DocumentHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [transitioning, setTransitioning] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (history.length > 0) return; // already loaded
    try {
      setLoadingHistory(true);
      const h = await getDocumentHistory(projectId, doc.id);
      setHistory(h);
    } catch {
      // silent — history is non-critical
    } finally {
      setLoadingHistory(false);
    }
  }, [projectId, doc.id, history.length]);

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) loadHistory();
  };

  const handleTransition = async (action: DocumentAction) => {
    try {
      setTransitioning(action);
      await transitionDocument(projectId, doc.id, { action });
      toast.success(`Document "${doc.title}" — ${ACTION_LABELS[action]}`);
      setHistory([]); // reset so it reloads on expand
      onTransition();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.code ||
        err?.message ||
        'Transition failed';
      toast.error(msg);
    } finally {
      setTransitioning(null);
    }
  };

  const allowedActions = ALLOWED_TRANSITIONS[doc.status] ?? [];

  // Filter actions based on role
  // Owner actions: start_draft, submit_for_review, mark_complete, create_new_version
  // Reviewer actions: approve, request_changes
  // Admins can do all
  const isOwner = doc.ownerUserId === userId;
  const isReviewer = false; // Reviewer info not yet in summary — admin can always act
  const visibleActions = allowedActions.filter((action) => {
    if (isAdmin) return true;
    const ownerActions: DocumentAction[] = [
      'start_draft',
      'submit_for_review',
      'mark_complete',
      'create_new_version',
    ];
    const reviewerActions: DocumentAction[] = ['approve', 'request_changes'];
    if (ownerActions.includes(action)) return isOwner;
    if (reviewerActions.includes(action)) return isReviewer || isAdmin;
    return false;
  });

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={handleToggle}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
        )}

        <FileText className="h-4 w-4 text-slate-500 shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-900 truncate">
              {doc.title}
            </span>
            {doc.isRequired && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium">
                Required
              </span>
            )}
            {doc.blocksGateKey && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-medium flex items-center gap-0.5">
                <Shield className="h-2.5 w-2.5" />
                Blocks Gate
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            v{doc.version} &middot; {doc.docKey} &middot; Updated{' '}
            {new Date(doc.updatedAt).toLocaleDateString()}
          </div>
        </div>

        <StatusPill status={doc.status} />

        {/* Actions */}
        <div
          className="flex items-center gap-1.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {visibleActions.map((action) => (
            <button
              key={action}
              onClick={() => handleTransition(action)}
              disabled={transitioning !== null}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors disabled:opacity-50 ${
                ACTION_VARIANTS[action] ?? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              {transitioning === action ? '...' : ACTION_LABELS[action]}
            </button>
          ))}
        </div>
      </div>

      {/* Expanded: Version history */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
          <h4 className="text-xs font-semibold text-slate-600 mb-2">
            Version History
          </h4>
          {loadingHistory && (
            <div className="text-xs text-slate-400">Loading...</div>
          )}
          {!loadingHistory && history.length === 0 && (
            <div className="text-xs text-slate-400">No version history yet.</div>
          )}
          {!loadingHistory && history.length > 0 && (
            <div className="space-y-1.5">
              {history.map((h, i) => (
                <div
                  key={`${h.version}-${i}`}
                  className="flex items-center gap-3 text-xs"
                >
                  <span className="text-slate-500 w-12 shrink-0">
                    v{h.version}
                  </span>
                  <StatusPill status={h.status} />
                  <span className="text-slate-500 flex-1 truncate">
                    {h.changeSummary || '—'}
                  </span>
                  <span className="text-slate-400 shrink-0">
                    {new Date(h.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── Tab Component ───────────────────────────────────────── */

export const ProjectDocumentWorkflowTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.platformRole);

  const [docs, setDocs] = useState<DocumentInstanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocs = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await listProjectDocumentWorkflow(projectId);
      setDocs(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to load document workflow');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  if (!projectId || !activeWorkspaceId) {
    return <div className="p-6 text-slate-500">No project selected.</div>;
  }

  // Separate required (gate-blocking) docs from optional
  const requiredDocs = docs.filter((d) => d.isRequired || d.blocksGateKey);
  const optionalDocs = docs.filter((d) => !d.isRequired && !d.blocksGateKey);

  // Compute completion stats
  const totalRequired = requiredDocs.length;
  const readyRequired = requiredDocs.filter(
    (d) => d.status === 'approved' || d.status === 'completed',
  ).length;

  return (
    <div data-testid="document-workflow-root">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">
            Document Workflow
          </h2>
          <span className="text-sm text-slate-400">({docs.length})</span>
        </div>
        {totalRequired > 0 && (
          <div className="flex items-center gap-2 text-sm">
            {readyRequired === totalRequired ? (
              <span className="flex items-center gap-1 text-green-600 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                All required documents ready
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 font-medium">
                <AlertCircle className="h-4 w-4" />
                {readyRequired}/{totalRequired} required documents ready
              </span>
            )}
          </div>
        )}
      </div>

      {/* Loading / Error */}
      {loading && <InlineLoadingState message="Loading document workflow..." />}
      {error && <div className="text-red-600 text-sm mb-4">{error}</div>}

      {/* Empty */}
      {!loading && docs.length === 0 && (
        <EmptyStateCard
          title="No document workflow configured"
          description="Apply a template with document requirements to enable document workflow for this project."
          variant="default"
          icon={FileText}
        />
      )}

      {/* Required documents section */}
      {!loading && requiredDocs.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-amber-500" />
            Required Documents
          </h3>
          <div className="space-y-2">
            {requiredDocs.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                projectId={projectId}
                isAdmin={isAdmin}
                userId={user?.id ?? ''}
                onTransition={loadDocs}
              />
            ))}
          </div>
        </div>
      )}

      {/* Optional documents section */}
      {!loading && optionalDocs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">
            Additional Documents
          </h3>
          <div className="space-y-2">
            {optionalDocs.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                projectId={projectId}
                isAdmin={isAdmin}
                userId={user?.id ?? ''}
                onTransition={loadDocs}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDocumentWorkflowTab;
