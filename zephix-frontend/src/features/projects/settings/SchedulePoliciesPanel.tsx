/**
 * Schedule Policies Panel — Step 15.7
 *
 * Displays and (for admins) edits schedule governance policies
 * at the project scope. Reads resolved policies and allows overrides.
 */

import { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

interface PolicyOverride {
  key: string;
  value: unknown;
}

interface ResolvedPolicy {
  key: string;
  resolvedValue: unknown;
  source: string;
  definition: {
    key: string;
    description: string;
    valueType: string;
    defaultValue: unknown;
    metadata?: { min?: number; max?: number; options?: string[] } | null;
  };
}

interface Props {
  projectId: string;
  isAdmin: boolean;
}

const SCHEDULE_KEYS = [
  'schedule_enabled',
  'schedule_enforcement_mode',
  'schedule_at_risk_threshold_percent',
  'schedule_delayed_threshold_percent',
  'schedule_min_threshold_days',
  'schedule_block_completion_when_delayed',
];

const LABELS: Record<string, string> = {
  schedule_enabled: 'Schedule Governance',
  schedule_enforcement_mode: 'Enforcement Mode',
  schedule_at_risk_threshold_percent: 'At-Risk Threshold (%)',
  schedule_delayed_threshold_percent: 'Delayed Threshold (%)',
  schedule_min_threshold_days: 'Min Threshold (days)',
  schedule_block_completion_when_delayed: 'Block Completion When Delayed',
};

export function SchedulePoliciesPanel({ projectId, isAdmin }: Props) {
  const [resolved, setResolved] = useState<ResolvedPolicy[]>([]);
  const [overrides, setOverrides] = useState<PolicyOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const loadPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const [resolvedRes, overridesRes] = await Promise.all([
        apiClient.get('/policies/resolved', { params: { workspaceId: '' } }),
        apiClient.get(`/policies/overrides/project/${projectId}`),
      ]);
      const allResolved = ((resolvedRes.data as any)?.data ?? (resolvedRes.data as any) ?? []) as ResolvedPolicy[];
      setResolved(allResolved.filter((p) => SCHEDULE_KEYS.includes(p.key)));
      setOverrides(((overridesRes.data as any)?.data ?? (overridesRes.data as any) ?? []) as PolicyOverride[]);
    } catch {
      // Fail silently — policies may not be seeded yet
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  const handleOverride = async (key: string, value: unknown) => {
    try {
      setSaving(key);
      await apiClient.put(`/policies/overrides/project/${projectId}`, {
        key,
        value,
      });
      toast.success(`Policy '${LABELS[key] ?? key}' updated`);
      await loadPolicies();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update policy');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    );
  }

  if (resolved.length === 0) {
    return (
      <div className="text-sm text-gray-400">
        Schedule policies not available. Run migrations to seed definitions.
      </div>
    );
  }

  const getOverride = (key: string) => overrides.find((o) => o.key === key);
  const getResolved = (key: string) => resolved.find((r) => r.key === key);

  return (
    <div className="space-y-4" data-testid="schedule-policies-panel">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-indigo-600" />
        <h3 className="text-base font-semibold text-gray-900">Schedule Policies</h3>
      </div>
      <p className="text-xs text-gray-500">
        Configure schedule variance thresholds and enforcement for this project.
        Project overrides take highest precedence.
      </p>

      <div className="divide-y divide-gray-100">
        {SCHEDULE_KEYS.map((key) => {
          const r = getResolved(key);
          if (!r) return null;
          const hasOverride = !!getOverride(key);
          const def = r.definition;
          const isSaving = saving === key;

          return (
            <div key={key} className="py-3 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{LABELS[key] ?? key}</span>
                  {hasOverride && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 rounded px-1.5 py-0.5 font-medium">
                      Project Override
                    </span>
                  )}
                  {!hasOverride && r.source !== 'SYSTEM' && (
                    <span className="text-[10px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 font-medium">
                      {r.source}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{def.description}</p>
              </div>

              <div className="flex-shrink-0 w-40">
                {def.valueType === 'BOOLEAN' ? (
                  <button
                    onClick={() => isAdmin && handleOverride(key, !r.resolvedValue)}
                    disabled={!isAdmin || !!isSaving}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      r.resolvedValue
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    } ${!isAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  >
                    {isSaving ? '...' : r.resolvedValue ? 'Enabled' : 'Disabled'}
                  </button>
                ) : def.valueType === 'STRING' && def.metadata?.options ? (
                  <select
                    value={String(r.resolvedValue)}
                    onChange={(e) => handleOverride(key, e.target.value)}
                    disabled={!isAdmin || !!isSaving}
                    className="text-xs border border-gray-200 rounded px-2 py-1.5 w-full disabled:opacity-60"
                  >
                    {def.metadata.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : def.valueType === 'NUMBER' ? (
                  <input
                    type="number"
                    value={Number(r.resolvedValue)}
                    min={def.metadata?.min}
                    max={def.metadata?.max}
                    onChange={(e) => {
                      const num = Number(e.target.value);
                      if (!isNaN(num)) handleOverride(key, num);
                    }}
                    disabled={!isAdmin || !!isSaving}
                    className="text-xs border border-gray-200 rounded px-2 py-1.5 w-full disabled:opacity-60"
                  />
                ) : (
                  <span className="text-xs text-gray-500">{JSON.stringify(r.resolvedValue)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Warning about HARD mode */}
      {getResolved('schedule_enforcement_mode')?.resolvedValue === 'HARD' &&
        getResolved('schedule_block_completion_when_delayed')?.resolvedValue === true && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>HARD enforcement active.</strong> Task and phase completion will be blocked
            when the schedule status is DELAYED. Users must resolve the delay before completing.
          </span>
        </div>
      )}
    </div>
  );
}
