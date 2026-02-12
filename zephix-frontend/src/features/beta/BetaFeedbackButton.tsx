// ─────────────────────────────────────────────────────────────────────────────
// BetaFeedbackButton — Step 25 PM Beta Execution Framework
//
// Floating "Give Feedback" button (bottom-right). Only visible when
// isBetaMode() === true. Opens a compact modal for structured feedback.
// Auto-detects surface from the current route.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { MessageSquarePlus, X } from 'lucide-react';
import { isBetaMode } from '@/lib/flags';
import { apiClient } from '@/lib/api/client';

// ─── Types ──────────────────────────────────────────────────────────────────

type FeedbackSurface = 'OVERVIEW' | 'TASK_DETAIL' | 'GANTT' | 'TABLE' | 'INTEGRATIONS' | 'OTHER';
type FeedbackSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKER';
type FeedbackType = 'CONFUSING' | 'BUG' | 'MISSING_FEATURE' | 'UX_FRICTION' | 'PERFORMANCE' | 'OTHER';
type LinkedFeature = 'SCHEDULE' | 'GOVERNANCE' | 'EVIDENCE' | 'RESOURCE' | 'UX' | 'INTEGRATION' | 'OTHER';

const SEVERITY_OPTIONS: Array<{ value: FeedbackSeverity; label: string }> = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'BLOCKER', label: 'Blocker' },
];

const TYPE_OPTIONS: Array<{ value: FeedbackType; label: string }> = [
  { value: 'CONFUSING', label: 'Confusing' },
  { value: 'BUG', label: 'Bug' },
  { value: 'MISSING_FEATURE', label: 'Missing Feature' },
  { value: 'UX_FRICTION', label: 'UX Friction' },
  { value: 'PERFORMANCE', label: 'Performance' },
  { value: 'OTHER', label: 'Other' },
];

const FEATURE_OPTIONS: Array<{ value: LinkedFeature; label: string }> = [
  { value: 'SCHEDULE', label: 'Schedule' },
  { value: 'GOVERNANCE', label: 'Governance' },
  { value: 'EVIDENCE', label: 'Evidence' },
  { value: 'RESOURCE', label: 'Resources' },
  { value: 'UX', label: 'UX / Layout' },
  { value: 'INTEGRATION', label: 'Integrations' },
  { value: 'OTHER', label: 'Other' },
];

// ─── Surface auto-detection ─────────────────────────────────────────────────

function detectSurface(pathname: string): FeedbackSurface {
  if (pathname.includes('/view/gantt') || pathname.includes('/gantt')) return 'GANTT';
  if (pathname.includes('/view/table') || pathname.includes('/table')) return 'TABLE';
  if (pathname.includes('/tasks/') || pathname.includes('/view/list')) return 'TASK_DETAIL';
  if (pathname.includes('/tools/overview') || pathname.includes('/overview')) return 'OVERVIEW';
  if (pathname.includes('/integrations')) return 'INTEGRATIONS';
  return 'OTHER';
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BetaFeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [severity, setSeverity] = useState<FeedbackSeverity>('MEDIUM');
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('UX_FRICTION');
  const [linkedFeature, setLinkedFeature] = useState<LinkedFeature>('OTHER');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const location = useLocation();
  const params = useParams<{ workspaceId?: string; projectId?: string }>();

  const surface = useMemo(() => detectSurface(location.pathname), [location.pathname]);

  // Extract workspaceId from URL params or localStorage
  const workspaceId = useMemo(() => {
    if (params.workspaceId) return params.workspaceId;
    try {
      const ws = localStorage.getItem('workspace-storage');
      if (ws) {
        const { state } = JSON.parse(ws);
        return state?.activeWorkspaceId ?? null;
      }
    } catch { /* ignore */ }
    return null;
  }, [params.workspaceId]);

  const handleSubmit = useCallback(async () => {
    if (!message.trim() || !workspaceId) return;
    setSubmitting(true);
    try {
      await apiClient.post('/beta/feedback', {
        workspaceId,
        projectId: params.projectId ?? undefined,
        surface,
        severity,
        feedbackType,
        linkedFeature,
        message: message.trim(),
      });
      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setMessage('');
        setSeverity('MEDIUM');
        setFeedbackType('UX_FRICTION');
        setLinkedFeature('OTHER');
      }, 1500);
    } catch {
      // Fail-open — swallow
    } finally {
      setSubmitting(false);
    }
  }, [message, workspaceId, params.projectId, surface, severity, feedbackType]);

  // Only render in beta mode
  if (!isBetaMode()) return null;

  // Don't render on admin pages (they have their own dashboard)
  if (location.pathname.startsWith('/admin')) return null;

  return (
    <>
      {/* Floating trigger button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg shadow-lg hover:bg-slate-700 transition-colors"
          title="Give Feedback"
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span>Feedback</span>
        </button>
      )}

      {/* Modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-6">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-96 bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Give Feedback</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {submitted ? (
              <div className="p-6 text-center">
                <div className="text-green-600 text-sm font-medium">Thank you for your feedback.</div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {/* Surface (auto-detected, read-only) */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Surface (auto-detected)</label>
                  <div className="text-sm text-slate-700 bg-slate-50 px-3 py-1.5 rounded border border-slate-100">
                    {surface.replace('_', ' ')}
                  </div>
                </div>

                {/* Severity */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Severity</label>
                  <div className="flex gap-1">
                    {SEVERITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSeverity(opt.value)}
                        className={`flex-1 text-xs py-1.5 rounded border transition-colors ${
                          severity === opt.value
                            ? opt.value === 'BLOCKER'
                              ? 'bg-red-50 border-red-300 text-red-700'
                              : opt.value === 'HIGH'
                                ? 'bg-amber-50 border-amber-300 text-amber-700'
                                : 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                  <select
                    value={feedbackType}
                    onChange={(e) => setFeedbackType(e.target.value as FeedbackType)}
                    className="w-full text-sm border border-slate-200 rounded px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Feature Area (Step 26) */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Feature Area</label>
                  <select
                    value={linkedFeature}
                    onChange={(e) => setLinkedFeature(e.target.value as LinkedFeature)}
                    className="w-full text-sm border border-slate-200 rounded px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  >
                    {FEATURE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What happened? What did you expect?"
                    rows={3}
                    className="w-full text-sm border border-slate-200 rounded px-3 py-2 bg-white text-slate-700 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || submitting || !workspaceId}
                  className="w-full text-sm font-medium py-2 rounded bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
