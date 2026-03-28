/**
 * Phase 2B: Baseline management panel for project overview.
 * Shows baseline list, create modal, compare view.
 * Only visible to workspace_owner or platform admin.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { isPlatformAdmin } from '@/utils/access';
import {
  listBaselines,
  createBaseline,
  activateBaseline,
  compareBaseline,
  type Baseline,
  type BaselineCompareResult,
} from '@/features/work-management/schedule.api';
import { Layers, Plus, Check, ArrowRight, X, AlertTriangle, Clock } from 'lucide-react';

interface Props {
  projectId: string;
  baselinesEnabled: boolean;
  workspaceRole?: string;
}

export const BaselinePanel: React.FC<Props> = ({ projectId, baselinesEnabled, workspaceRole }) => {
  const { user } = useAuth();
  const canManage =
    isPlatformAdmin(user) ||
    workspaceRole === 'workspace_owner' ||
    workspaceRole === 'delivery_owner';

  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [setActive, setSetActive] = useState(true);
  const [creating, setCreating] = useState(false);
  const [compare, setCompare] = useState<BaselineCompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await listBaselines(projectId);
      setBaselines(Array.isArray(data) ? data : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  if (!baselinesEnabled || !canManage) return null;

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await createBaseline(projectId, {
        name: createName.trim(),
        setActive,
      });
      setShowCreate(false);
      setCreateName('');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create baseline');
    } finally {
      setCreating(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await activateBaseline(id);
      await load();
    } catch {
      // silent
    }
  };

  const handleCompare = async (id: string) => {
    try {
      const result = await compareBaseline(id);
      setCompare(result);
    } catch {
      // silent
    }
  };

  return (
    <div className="bg-white rounded-lg border p-6" data-testid="baseline-panel">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Layers className="h-5 w-5 text-indigo-600" />
          Schedule Baselines
        </h3>
        {canManage && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Baseline
          </button>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="mb-4 p-4 bg-slate-50 rounded-lg border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-700">New Baseline</p>
            <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            type="text"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="Baseline name (e.g., Sprint 1 Plan)"
            className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <label className="flex items-center gap-2 mt-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={setActive}
              onChange={(e) => setSetActive(e.target.checked)}
              className="rounded border-slate-300"
            />
            Set as active baseline
          </label>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCreate}
              disabled={creating || !createName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Baselines list */}
      {loading ? (
        <div className="py-4 text-center text-slate-400 text-sm">Loading...</div>
      ) : baselines.length === 0 ? (
        <p className="text-sm text-slate-500">No baselines yet. Create one to track schedule variance.</p>
      ) : (
        <ul className="space-y-2">
          {baselines.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 truncate">{b.name}</p>
                  {b.isActive && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {new Date(b.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <button
                  onClick={() => handleCompare(b.id)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Compare
                </button>
                {!b.isActive && canManage && (
                  <button
                    onClick={() => handleActivate(b.id)}
                    className="text-xs text-green-600 hover:text-green-800 font-medium"
                  >
                    Activate
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Compare view */}
      {compare && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-blue-900">
              Compare: {compare.baselineName}
            </p>
            <button onClick={() => setCompare(null)} className="text-blue-400 hover:text-blue-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">
                {compare.projectSummary.countLate}
              </p>
              <p className="text-xs text-slate-500">Tasks late</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">
                {Math.round(compare.projectSummary.maxSlipMinutes / 60)}h
              </p>
              <p className="text-xs text-slate-500">Max slip</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {Math.round(compare.projectSummary.criticalPathSlipMinutes / 60)}h
              </p>
              <p className="text-xs text-slate-500">Critical path slip</p>
            </div>
          </div>
          {compare.items
            .filter((i) => i.endVarianceMinutes > 0)
            .slice(0, 10)
            .map((item) => (
              <div key={item.taskId} className="flex items-center gap-2 py-1 text-xs">
                {item.isCriticalInBaseline && (
                  <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                )}
                <span className="text-slate-700 truncate flex-1">{item.taskTitle}</span>
                <span className="text-red-600 font-medium shrink-0">
                  +{Math.round(item.endVarianceMinutes / 60)}h
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};
