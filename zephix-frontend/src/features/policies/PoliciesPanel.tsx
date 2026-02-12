/**
 * Minimal Policies panel – used in org settings and workspace settings.
 * Admin-only editing. Members see read-only view.
 */
import { useState, useEffect, useCallback } from 'react';
import { Shield, Save, RotateCcw, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  PolicyResolution,
  getResolvedPolicies,
  upsertOrgOverride,
  upsertWorkspaceOverride,
} from './policies.api';

interface PoliciesPanelProps {
  workspaceId?: string;
  isAdmin: boolean;
  scope: 'ORG' | 'WORKSPACE';
}

const DISPLAY_KEYS = [
  'phase_gate_enforcement_mode',
  'phase_gate_required_by_default',
  'gate_required_documents_min',
  'gate_required_checklist_min',
  'wip_default_limit',
  'allocation_warning_percent',
  'allocation_block_percent',
  'budget_variance_warn_percent',
  'budget_variance_block_percent',
];

function labelForKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b[a-z]/g, c => c.toUpperCase());
}

export function PoliciesPanel({ workspaceId, isAdmin, scope }: PoliciesPanelProps) {
  const [policies, setPolicies] = useState<PolicyResolution[]>([]);
  const [editing, setEditing] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const loadPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const resolved = await getResolvedPolicies(workspaceId);
      setPolicies(resolved.filter(p => DISPLAY_KEYS.includes(p.key)));
    } catch (err: any) {
      toast.error('Failed to load policies');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  const handleSave = async (key: string) => {
    if (!isAdmin) return;
    const val = editing[key];
    if (val === undefined) return;
    setSaving(key);
    try {
      if (scope === 'WORKSPACE' && workspaceId) {
        await upsertWorkspaceOverride(workspaceId, key, val);
      } else {
        await upsertOrgOverride(key, val);
      }
      toast.success(`Updated ${labelForKey(key)}`);
      setEditing(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      await loadPolicies();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save override');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-500">Loading policies...</div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-indigo-600" />
        <h3 className="text-sm font-semibold text-gray-900">
          {scope === 'WORKSPACE' ? 'Workspace' : 'Organization'} Policies
        </h3>
      </div>

      <div className="space-y-3">
        {policies.map(p => (
          <PolicyRow
            key={p.key}
            policy={p}
            isAdmin={isAdmin}
            editValue={editing[p.key]}
            saving={saving === p.key}
            onEdit={(val) => setEditing(prev => ({ ...prev, [p.key]: val }))}
            onSave={() => handleSave(p.key)}
            onReset={() => setEditing(prev => {
              const next = { ...prev };
              delete next[p.key];
              return next;
            })}
          />
        ))}
      </div>

      {policies.length === 0 && (
        <p className="text-xs text-gray-400 py-2">No policies found.</p>
      )}
    </div>
  );
}

// ─── Row component ──────────────────────────────────────────

interface PolicyRowProps {
  policy: PolicyResolution;
  isAdmin: boolean;
  editValue: unknown;
  saving: boolean;
  onEdit: (val: unknown) => void;
  onSave: () => void;
  onReset: () => void;
}

function PolicyRow({ policy, isAdmin, editValue, saving, onEdit, onSave, onReset }: PolicyRowProps) {
  const { key, resolvedValue, source, definition } = policy;
  const isEditing = editValue !== undefined;
  const displayVal = isEditing ? editValue : resolvedValue;

  return (
    <div className="flex items-start justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-800 truncate">
            {labelForKey(key)}
          </span>
          <span
            className={`text-[10px] px-1 rounded ${
              source === 'WORKSPACE'
                ? 'bg-blue-100 text-blue-700'
                : source === 'ORG'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {source}
          </span>
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5 truncate">
          {definition.description}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {isAdmin ? (
          <PolicyInput
            definition={definition}
            value={displayVal}
            onChange={onEdit}
            disabled={saving}
          />
        ) : (
          <span className="text-xs text-gray-600 font-mono">
            {String(resolvedValue)}
          </span>
        )}

        {isAdmin && isEditing && (
          <>
            <button
              onClick={onSave}
              disabled={saving}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
              title="Save"
            >
              <Save className="w-3 h-3" />
            </button>
            <button
              onClick={onReset}
              disabled={saving}
              className="p-1 text-gray-400 hover:bg-gray-50 rounded"
              title="Reset"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Input controls ─────────────────────────────────────────

interface PolicyInputProps {
  definition: { valueType: string; metadata: { min?: number; max?: number; options?: string[] } | null };
  value: unknown;
  onChange: (val: unknown) => void;
  disabled: boolean;
}

function PolicyInput({ definition, value, onChange, disabled }: PolicyInputProps) {
  const { valueType, metadata } = definition;

  if (valueType === 'BOOLEAN') {
    return (
      <button
        className={`text-xs px-2 py-0.5 rounded ${
          value ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}
        onClick={() => onChange(!value)}
        disabled={disabled}
      >
        {value ? 'Yes' : 'No'}
      </button>
    );
  }

  if (valueType === 'STRING' && metadata?.options?.length) {
    return (
      <select
        className="text-xs border rounded px-1 py-0.5"
        value={String(value)}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
      >
        {metadata.options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }

  if (valueType === 'NUMBER') {
    return (
      <input
        type="number"
        className="text-xs border rounded px-1 py-0.5 w-16 text-right"
        value={value as number}
        min={metadata?.min}
        max={metadata?.max}
        onChange={e => onChange(Number(e.target.value))}
        disabled={disabled}
      />
    );
  }

  // STRING or JSON — simple text
  return (
    <input
      type="text"
      className="text-xs border rounded px-1 py-0.5 w-24"
      value={typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}
      onChange={e => {
        try {
          onChange(JSON.parse(e.target.value));
        } catch {
          onChange(e.target.value);
        }
      }}
      disabled={disabled}
    />
  );
}

export default PoliciesPanel;
