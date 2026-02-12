/**
 * ExecutionEvidencePanel — Step 17.4
 *
 * Read-only evidence panel showing schedule, resource, and governance
 * status with a decision-based timeline.
 *
 * Access points:
 * - Project Tools → "Evidence"
 * - Task detail → tab "Evidence"
 * - Phase context → cmd+K → "View Evidence"
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  Shield,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Download,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ExplanationBanner, resolveExecutionExplanations } from '@/features/explanations';
import type { ExplanationContext } from '@/features/explanations';
import { InlineLoadingState } from '@/components/ui/states';
import { intentColors } from '@/design/tokens';
import { typography } from '@/design/typography';
import { trackBeta } from '@/lib/telemetry';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScheduleEvidence {
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  forecastEndDate: string | null;
  status: string;
  startVarianceDays: number | null;
  endVarianceDays: number | null;
  plannedDurationDays: number | null;
  actualDurationDays: number | null;
  policyApplied: string | null;
}

interface ResourceEvidence {
  assigneeUserId: string | null;
  utilizationPercent: number | null;
  isOverAllocated: boolean;
  totalAllocationPercent: number | null;
  riskDrivers: string[];
  policyApplied: boolean;
}

interface GovernanceEvidence {
  phaseGatesEnabled: boolean;
  gateStatus: string | null;
  enforcementMode: string | null;
  blocked: boolean;
  blockReason: string | null;
  warnings: string[];
}

interface LifecycleEvidence {
  status: string;
  lifecycle: string;
  startedAt: string | null;
  completedAt: string | null;
  blockedReason: string | null;
}

interface TimelineItem {
  timestamp: string;
  category: string;
  eventType: string;
  summary: string;
  metadata: Record<string, any> | null;
  actorUserId: string;
}

interface ActivitySummary {
  totalEvents: number;
  lastDecision: { timestamp: string; type: string; summary: string } | null;
  keyEvents: Array<{ timestamp: string; type: string; summary: string }>;
}

interface ExecutionEvidence {
  scope: string;
  identifiers: { projectId: string; phaseId?: string; taskId?: string };
  generatedAt: string;
  schedule: ScheduleEvidence;
  resources: ResourceEvidence;
  governance: GovernanceEvidence;
  lifecycle: LifecycleEvidence;
  activitySummary: ActivitySummary;
  timeline: TimelineItem[];
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  scope: 'project' | 'phase' | 'task';
  id: string;
}

// ─── Helper Components ───────────────────────────────────────────────────────

// StatusBadge imported from @/components/ui/StatusBadge

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; children?: React.ReactNode }> = ({
  icon, title, children,
}) => (
  <div className="flex items-center justify-between mb-2">
    <div className={`flex items-center gap-2 ${typography.sectionTitle}`}>
      {icon}
      {title}
    </div>
    {children}
  </div>
);

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between py-1 text-xs">
    <span className="text-gray-500">{label}</span>
    <span className="text-gray-900 font-medium">{value ?? '—'}</span>
  </div>
);

const formatDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const CategoryIcon: React.FC<{ category: string }> = ({ category }) => {
  const cls = 'h-3 w-3 flex-shrink-0';
  switch (category) {
    case 'SCHEDULE': return <Clock className={`${cls} text-blue-500`} />;
    case 'RESOURCE': return <Users className={`${cls} text-purple-500`} />;
    case 'GOVERNANCE': return <Shield className={`${cls} text-amber-500`} />;
    case 'EXECUTION': return <Activity className={`${cls} text-gray-500`} />;
    case 'DOCUMENT': return <CheckCircle className={`${cls} text-green-500`} />;
    case 'DEPENDENCY': return <AlertTriangle className={`${cls} text-orange-500`} />;
    default: return <Activity className={`${cls} text-gray-400`} />;
  }
};

// ─── Download helpers ─────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function dateStamp() {
  return new Date().toISOString().split('T')[0];
}

// ─── Main Component ──────────────────────────────────────────────────────────

type ExportFormat = 'JSON' | 'CSV' | 'PDF';

const EXPORT_OPTIONS: { format: ExportFormat; label: string; mime: string; ext: string }[] = [
  { format: 'JSON', label: 'JSON', mime: 'application/json', ext: 'json' },
  { format: 'CSV', label: 'CSV (zip)', mime: 'application/zip', ext: 'zip' },
  { format: 'PDF', label: 'PDF', mime: 'application/pdf', ext: 'pdf' },
];

export const ExecutionEvidencePanel: React.FC<Props> = ({ scope, id }) => {
  const [evidence, setEvidence] = useState<ExecutionEvidence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await apiClient.get(`/work/evidence/${scope}/${id}`);
        if (!cancelled) setEvidence(res.data?.data ?? res.data);
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.message ?? 'Failed to load evidence');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [scope, id]);

  const handleExport = async (format: ExportFormat) => {
    setExporting(true);
    setExportError(null);
    setExportDropdownOpen(false);
    trackBeta('USER_EXPORTED_EVIDENCE', undefined, { scope, id, format });
    try {
      const opt = EXPORT_OPTIONS.find((o) => o.format === format)!;
      const url = `/work/evidence/${scope}/${id}/export?format=${format}`;

      if (format === 'JSON') {
        const res = await apiClient.get(url);
        const payload = res.data?.data ?? res.data;
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: opt.mime });
        downloadBlob(blob, `evidence-${id.slice(0, 8)}-${dateStamp()}.${opt.ext}`);
      } else {
        // Binary (CSV zip or PDF)
        const res = await apiClient.get(url, { responseType: 'blob' });
        downloadBlob(res.data, `evidence-${id.slice(0, 8)}-${dateStamp()}.${opt.ext}`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Export failed';
      setExportError(typeof msg === 'string' ? msg : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <InlineLoadingState message="Loading evidence..." />;
  }

  if (error || !evidence) {
    return (
      <div className={`${intentColors.danger.bg} border ${intentColors.danger.border} rounded-lg p-4 ${typography.body} ${intentColors.danger.text}`}>
        {error ?? 'No evidence available'}
      </div>
    );
  }

  const { schedule, resources, governance, lifecycle, activitySummary, timeline } = evidence;

  // ─── Explanation context (Step 20.3) ───────────────────────────────────
  const explanations = useMemo(() => {
    const ctx: ExplanationContext = {
      task: lifecycle ? {
        id: evidence.identifiers.taskId ?? evidence.identifiers.phaseId ?? evidence.identifiers.projectId,
        status: lifecycle.status,
        lifecycle: lifecycle.lifecycle,
        blockedReason: lifecycle.blockedReason,
      } : undefined,
      schedule: {
        status: schedule.status,
        endVarianceDays: schedule.endVarianceDays,
        startVarianceDays: schedule.startVarianceDays,
        forecastEndDate: schedule.forecastEndDate,
      },
      resource: {
        isOverAllocated: resources.isOverAllocated,
        totalAllocationPercent: resources.totalAllocationPercent,
        utilizationPercent: resources.utilizationPercent,
        riskDrivers: resources.riskDrivers,
      },
      gate: governance.phaseGatesEnabled ? {
        blocked: governance.blocked,
        enforcementMode: governance.enforcementMode ?? 'OFF',
        warnings: governance.warnings.map((w) => ({ code: 'GATE_WARNING', message: w })),
        requiredActions: [],
      } : undefined,
    };
    return resolveExecutionExplanations(ctx);
  }, [evidence, schedule, resources, governance, lifecycle]);

  return (
    <div className="space-y-4" data-testid="execution-evidence-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            Execution Evidence
          </h3>
          <span className="text-[10px] text-gray-400">
            Generated {formatDate(evidence.generatedAt)}
          </span>
        </div>
        <div className="relative">
          <button
            onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
            disabled={exporting}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
            data-testid="export-evidence-btn"
          >
            <Download className="h-3 w-3" />
            {exporting ? 'Exporting...' : 'Export'}
            <ChevronDown className="h-3 w-3" />
          </button>
          {exportDropdownOpen && !exporting && (
            <div className="absolute right-0 mt-1 w-32 bg-white border rounded-lg shadow-lg z-10" data-testid="export-dropdown">
              {EXPORT_OPTIONS.map((opt) => (
                <button
                  key={opt.format}
                  onClick={() => handleExport(opt.format)}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                  data-testid={`export-${opt.format.toLowerCase()}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Export error toast */}
      {exportError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 flex items-center justify-between" data-testid="export-error">
          <span>{exportError}</span>
          <button onClick={() => setExportError(null)} className="ml-2 text-red-500 hover:text-red-700">
            <XCircle className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Contextual Explanations — Step 20.3
          Step 23: Ordering comes from resolver output. Do NOT re-sort in UI. */}
      <ExplanationBanner explanations={explanations} />

      {/* Summary Badges */}
      <div className="grid grid-cols-3 gap-3">
        {/* Schedule */}
        <div className="bg-white border rounded-lg p-3">
          <SectionHeader icon={<Clock className="h-3.5 w-3.5 text-blue-600" />} title="Schedule">
            <StatusBadge status={schedule.status} />
          </SectionHeader>
          <div className="space-y-0.5">
            <InfoRow label="Planned" value={`${formatDate(schedule.plannedStartDate)} – ${formatDate(schedule.plannedEndDate)}`} />
            {schedule.endVarianceDays !== null && (
              <InfoRow
                label="Variance"
                value={
                  <span className={schedule.endVarianceDays > 0 ? 'text-red-600' : schedule.endVarianceDays < 0 ? 'text-green-600' : ''}>
                    {schedule.endVarianceDays > 0 ? '+' : ''}{schedule.endVarianceDays}d
                  </span>
                }
              />
            )}
            {schedule.forecastEndDate && (
              <InfoRow label="Forecast End" value={formatDate(schedule.forecastEndDate)} />
            )}
            {schedule.policyApplied && (
              <InfoRow label="Enforcement" value={schedule.policyApplied} />
            )}
          </div>
        </div>

        {/* Resources */}
        <div className="bg-white border rounded-lg p-3">
          <SectionHeader icon={<Users className="h-3.5 w-3.5 text-purple-600" />} title="Resources">
            {resources.isOverAllocated ? (
              <span className="flex items-center gap-1 text-[10px] text-red-600 font-medium">
                <AlertTriangle className="h-3 w-3" />
                Overloaded
              </span>
            ) : (
              <span className="text-[10px] text-green-600 font-medium">OK</span>
            )}
          </SectionHeader>
          <div className="space-y-0.5">
            {resources.assigneeUserId && (
              <InfoRow label="Assignee" value={`${resources.assigneeUserId.slice(0, 8)}...`} />
            )}
            {resources.totalAllocationPercent !== null && (
              <InfoRow label="Cross-project" value={`${resources.totalAllocationPercent}%`} />
            )}
            {resources.riskDrivers.length > 0 && (
              <InfoRow
                label="Risk Driver"
                value={
                  <span className="text-red-600 text-[10px]">
                    {resources.riskDrivers.join(', ')}
                  </span>
                }
              />
            )}
          </div>
        </div>

        {/* Governance */}
        <div className="bg-white border rounded-lg p-3">
          <SectionHeader icon={<Shield className="h-3.5 w-3.5 text-amber-600" />} title="Governance">
            {governance.blocked ? (
              <span className="flex items-center gap-1 text-[10px] text-red-600 font-medium">
                <XCircle className="h-3 w-3" />
                Blocked
              </span>
            ) : governance.phaseGatesEnabled ? (
              <span className="text-[10px] text-green-600 font-medium">Active</span>
            ) : (
              <span className="text-[10px] text-gray-400">Off</span>
            )}
          </SectionHeader>
          <div className="space-y-0.5">
            <InfoRow label="Phase Gates" value={governance.phaseGatesEnabled ? 'Enabled' : 'Disabled'} />
            {governance.gateStatus && (
              <InfoRow label="Gate Status" value={governance.gateStatus.replace(/_/g, ' ')} />
            )}
            {governance.enforcementMode && (
              <InfoRow label="Enforcement" value={governance.enforcementMode} />
            )}
            {governance.blockReason && (
              <InfoRow
                label="Block"
                value={<span className="text-red-600 text-[10px]">{governance.blockReason}</span>}
              />
            )}
          </div>
        </div>
      </div>

      {/* Lifecycle */}
      <div className="bg-white border rounded-lg p-3">
        <SectionHeader icon={<Activity className="h-3.5 w-3.5 text-gray-600" />} title="Lifecycle">
          <StatusBadge status={lifecycle.status} />
        </SectionHeader>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <InfoRow label="Started" value={formatDate(lifecycle.startedAt)} />
          <InfoRow label="Completed" value={formatDate(lifecycle.completedAt)} />
          {lifecycle.blockedReason && (
            <InfoRow label="Blocked" value={<span className="text-red-600">{lifecycle.blockedReason}</span>} />
          )}
        </div>
        {activitySummary.lastDecision && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-[11px]">
            <span className="text-gray-500">Last decision:</span>{' '}
            <span className="text-gray-900">{activitySummary.lastDecision.summary}</span>
            <span className="text-gray-400 ml-1">
              ({formatDate(activitySummary.lastDecision.timestamp)})
            </span>
          </div>
        )}
      </div>

      {/* Causal Signals */}
      {(resources.riskDrivers.length > 0 || governance.blocked || schedule.status === 'DELAYED') && (
        <div className={`${intentColors.warning.bg} border ${intentColors.warning.border} rounded-lg p-3`}>
          <h4 className={`${typography.label} ${intentColors.warning.text} mb-1`}>Causal Signals</h4>
          <ul className="space-y-1">
            {schedule.status === 'DELAYED' && (
              <li className="text-xs text-amber-800 flex items-start gap-1.5">
                <Clock className="h-3 w-3 mt-0.5 flex-shrink-0" />
                Schedule is delayed{schedule.endVarianceDays ? ` by ${schedule.endVarianceDays} days` : ''}
              </li>
            )}
            {resources.riskDrivers.includes('RESOURCE_OVERALLOCATION') && (
              <li className="text-xs text-amber-800 flex items-start gap-1.5">
                <Users className="h-3 w-3 mt-0.5 flex-shrink-0" />
                Assignee is overallocated across projects ({resources.totalAllocationPercent}%)
              </li>
            )}
            {governance.blocked && (
              <li className="text-xs text-amber-800 flex items-start gap-1.5">
                <Shield className="h-3 w-3 mt-0.5 flex-shrink-0" />
                {governance.blockReason || 'Blocked by governance policy'}
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Decision Timeline */}
      <div className="bg-white border rounded-lg">
        <button
          onClick={() => setTimelineExpanded(!timelineExpanded)}
          className="w-full flex items-center justify-between p-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-gray-600" />
            Decision Timeline ({timeline.length} events, {activitySummary.totalEvents} total)
          </div>
          {timelineExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {timelineExpanded && (
          <div className="border-t px-3 pb-3 max-h-80 overflow-y-auto">
            {timeline.length === 0 ? (
              <p className="py-4 text-center text-xs text-gray-400">No evidence events recorded</p>
            ) : (
              /* Step 23: Timeline ordering is backend-delivered. Do NOT sort in UI. */
              <div className="space-y-0" data-testid="evidence-timeline-list">
                {timeline.slice(0, 50).map((item, i) => (
                  <div key={i} className="flex items-start gap-2 py-1.5 border-b last:border-b-0">
                    <CategoryIcon category={item.category} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-900 leading-tight">{item.summary}</p>
                      <p className="text-[10px] text-gray-400">
                        {formatDate(item.timestamp)} · {item.category.toLowerCase()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutionEvidencePanel;
