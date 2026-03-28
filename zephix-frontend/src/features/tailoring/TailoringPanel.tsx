// ─────────────────────────────────────────────────────────────────────────────
// Tailoring Panel — Phase 4.5
//
// Reusable component for Org, Workspace, and Project settings.
// Admin: edit + save + apply to policies.
// Member: read-only resolved view.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  Save,
  Zap,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  getTailoringDefinitions,
  resolveTailoring,
  upsertOrgTailoring,
  upsertWorkspaceTailoring,
  upsertProjectTailoring,
  applyOrgTailoringToPolicies,
  applyWorkspaceTailoringToPolicies,
  type TailoringDefinitions,
  type TailoringResolveResult,
  type TailoringProfileFields,
} from './tailoring.api';

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  scope: 'ORG' | 'WORKSPACE' | 'PROJECT';
  scopeId: string;
  workspaceId: string;
  isAdmin: boolean;
}

// ─── Label maps ──────────────────────────────────────────────────────────────

const FIELD_LABELS: Record<keyof TailoringProfileFields, string> = {
  changeControlMode: 'Change Control',
  governanceMode: 'Governance',
  reportingCadence: 'Reporting Cadence',
  riskManagementMode: 'Risk Management',
  phaseGateMode: 'Phase Gates',
  wipMode: 'WIP Limits',
};

const SOURCE_COLORS: Record<string, string> = {
  SYSTEM: 'bg-gray-100 text-gray-600',
  ORG: 'bg-blue-100 text-blue-700',
  WORKSPACE: 'bg-indigo-100 text-indigo-700',
  PROJECT: 'bg-purple-100 text-purple-700',
};

const APPROACH_LABELS: Record<string, string> = {
  PREDICTIVE: 'Predictive (Waterfall)',
  ADAPTIVE: 'Adaptive (Agile)',
  HYBRID: 'Hybrid',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function TailoringPanel({
  scope,
  scopeId,
  workspaceId,
  isAdmin,
}: Props) {
  const [defs, setDefs] = useState<TailoringDefinitions | null>(null);
  const [resolved, setResolved] = useState<TailoringResolveResult | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Local editable state
  const [approach, setApproach] = useState<string>('HYBRID');
  const [profile, setProfile] = useState<TailoringProfileFields>({
    changeControlMode: 'OFF',
    governanceMode: 'LIGHT',
    reportingCadence: 'WEEKLY',
    riskManagementMode: 'BASIC',
    phaseGateMode: 'OFF',
    wipMode: 'OFF',
  });

  const loadData = useCallback(async () => {
    try {
      const [defsData, resolvedData] = await Promise.all([
        getTailoringDefinitions(),
        resolveTailoring(
          workspaceId,
          scope === 'PROJECT' ? scopeId : undefined,
        ),
      ]);
      setDefs(defsData);
      setResolved(resolvedData);
      setApproach(resolvedData.deliveryApproach);
      setProfile(resolvedData.profile);
    } catch {
      toast.error('Failed to load tailoring settings');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, scope, scopeId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { deliveryApproach: approach as any, profile };
      if (scope === 'ORG') {
        await upsertOrgTailoring(payload);
      } else if (scope === 'WORKSPACE') {
        await upsertWorkspaceTailoring(scopeId, payload);
      } else {
        await upsertProjectTailoring(scopeId, payload);
      }
      toast.success('Tailoring profile saved');
      await loadData();
    } catch {
      toast.error('Failed to save tailoring profile');
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      if (scope === 'ORG') {
        await applyOrgTailoringToPolicies();
      } else {
        await applyWorkspaceTailoringToPolicies(
          scope === 'WORKSPACE' ? scopeId : workspaceId,
        );
      }
      toast.success('Policies updated from tailoring profile');
      setShowConfirm(false);
      await loadData();
    } catch {
      toast.error('Failed to apply policies');
    } finally {
      setApplying(false);
    }
  };

  const setField = (key: keyof TailoringProfileFields, value: string) => {
    setProfile((p) => ({ ...p, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!defs || !resolved) return null;

  return (
    <div className="space-y-6" data-testid="tailoring-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Tailoring Profile
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure delivery approach and governance settings
          </p>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${SOURCE_COLORS[resolved.source] || 'bg-gray-100'}`}
        >
          Source: {resolved.source}
        </span>
      </div>

      {/* Delivery Approach */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Delivery Approach
        </label>
        {isAdmin ? (
          <select
            value={approach}
            onChange={(e) => setApproach(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
            data-testid="tailoring-approach"
          >
            {defs.deliveryApproach.map((a) => (
              <option key={a} value={a}>
                {APPROACH_LABELS[a] || a}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm font-medium text-gray-900">
            {APPROACH_LABELS[approach] || approach}
          </p>
        )}
      </div>

      {/* Profile fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(
          Object.keys(FIELD_LABELS) as Array<keyof TailoringProfileFields>
        ).map((key) => {
          const options = defs.profileKeys[key] || [];
          return (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {FIELD_LABELS[key]}
              </label>
              {isAdmin ? (
                <select
                  value={profile[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm"
                  data-testid={`tailoring-${key}`}
                >
                  {options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm font-medium text-gray-900">
                  {String(profile[key]).replace(/_/g, ' ')}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Admin actions */}
      {isAdmin && (
        <div className="flex items-center gap-3 pt-2 border-t">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            data-testid="tailoring-save"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Profile
          </button>

          {scope !== 'PROJECT' && (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={applying}
              className="inline-flex items-center gap-1.5 rounded bg-amber-50 border border-amber-200 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
              data-testid="tailoring-apply"
            >
              <Zap className="h-3.5 w-3.5" />
              Apply to Policies
            </button>
          )}
        </div>
      )}

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                Apply Tailoring to Policies
              </p>
              <p className="text-xs text-amber-700 mt-1 mb-3">
                This will write the following policy overrides at{' '}
                {scope === 'ORG' ? 'organization' : 'workspace'} level:
              </p>
              <div className="space-y-1 mb-3">
                {resolved.derivedPolicyOverrides.map((p) => (
                  <div
                    key={p.policyKey}
                    className="flex justify-between text-xs"
                  >
                    <span className="font-mono text-amber-800">
                      {p.policyKey}
                    </span>
                    <span className="text-amber-600">
                      {String(p.value)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="inline-flex items-center gap-1 rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {applying ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  Confirm
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="text-xs text-amber-600 hover:text-amber-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Derived overrides preview */}
      {resolved.derivedPolicyOverrides.length > 0 && !showConfirm && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Derived Policy Overrides
          </h4>
          <div className="rounded border divide-y text-xs">
            {resolved.derivedPolicyOverrides.map((p) => (
              <div
                key={p.policyKey}
                className="flex justify-between px-3 py-1.5"
              >
                <span className="font-mono text-gray-600">
                  {p.policyKey}
                </span>
                <span className="text-gray-900 font-medium">
                  {String(p.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
