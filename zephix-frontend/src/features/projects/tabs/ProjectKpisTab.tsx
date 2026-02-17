/**
 * ProjectKpisTab
 *
 * Wave 4C: Project KPI configuration and values tab.
 * - Shows table of KPIs with enabled toggle, target input, latest value, status badge
 * - Compute now button triggers backend computation
 * - Shows skipped KPIs with governance flag reasons
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { useProjectContext } from '../layout/ProjectPageLayout';
import { toast } from 'sonner';
import {
  BarChart3,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  HelpCircle,
} from 'lucide-react';
import {
  getProjectKpiConfigs,
  updateProjectKpiConfig,
  getProjectKpiValues,
  computeProjectKpis,
  type ProjectKpiConfig,
  type ProjectKpiValue,
  type SkippedKpi,
} from '@/features/kpis/api/projectKpis.api';

type KpiStatus = 'OK' | 'WARNING' | 'BREACH' | 'NO_DATA' | 'SKIPPED';

interface KpiRow {
  config: ProjectKpiConfig;
  latestValue: ProjectKpiValue | null;
  skippedInfo: SkippedKpi | null;
  status: KpiStatus;
}

function getStatusBadge(status: KpiStatus) {
  switch (status) {
    case 'OK':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle2 className="h-3 w-3" />
          OK
        </span>
      );
    case 'WARNING':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <AlertTriangle className="h-3 w-3" />
          Warning
        </span>
      );
    case 'BREACH':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="h-3 w-3" />
          Breach
        </span>
      );
    case 'SKIPPED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
          <MinusCircle className="h-3 w-3" />
          Skipped
        </span>
      );
    case 'NO_DATA':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
          <HelpCircle className="h-3 w-3" />
          No data
        </span>
      );
  }
}

function determineStatus(
  config: ProjectKpiConfig,
  value: ProjectKpiValue | null,
  skipped: SkippedKpi | null,
): KpiStatus {
  if (skipped) return 'SKIPPED';
  if (!value || value.valueNumeric === null) return 'NO_DATA';

  const numVal = parseFloat(String(value.valueNumeric));
  if (isNaN(numVal)) return 'NO_DATA';

  const critJson = config.thresholdCritical;
  if (critJson && typeof critJson === 'object') {
    const critVal = parseFloat(String(critJson.value ?? critJson.max ?? ''));
    if (!isNaN(critVal) && numVal >= critVal) return 'BREACH';
  }

  const warnJson = config.thresholdWarning;
  if (warnJson && typeof warnJson === 'object') {
    const warnVal = parseFloat(String(warnJson.value ?? warnJson.max ?? ''));
    if (!isNaN(warnVal) && numVal >= warnVal) return 'WARNING';
  }

  return 'OK';
}

export const ProjectKpisTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspaceId: workspaceId } = useWorkspaceStore();
  const { canWrite } = useWorkspaceRole(workspaceId);
  const { project } = useProjectContext();

  const [configs, setConfigs] = useState<ProjectKpiConfig[]>([]);
  const [values, setValues] = useState<ProjectKpiValue[]>([]);
  const [skipped, setSkipped] = useState<SkippedKpi[]>([]);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [lastComputedAt, setLastComputedAt] = useState<string | null>(null);
  const [engineVersion, setEngineVersion] = useState<string | null>(null);

  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const loadData = useCallback(async () => {
    if (!workspaceId || !projectId) return;
    try {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const [cfgs, vals] = await Promise.all([
        getProjectKpiConfigs(workspaceId, projectId),
        getProjectKpiValues(workspaceId, projectId, today, today),
      ]);
      setConfigs(cfgs);
      setValues(vals);

      if (vals.length > 0) {
        const latest = vals.reduce((a, b) =>
          new Date(a.computedAt) > new Date(b.computedAt) ? a : b,
        );
        setLastComputedAt(latest.computedAt);
        const ev = latest.valueJson?.engineVersion;
        if (ev) setEngineVersion(String(ev));
      }
    } catch (err: any) {
      console.error('Failed to load KPI data:', err);
      toast.error('Failed to load KPI configuration');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCompute = async () => {
    if (!workspaceId || !projectId) return;
    try {
      setComputing(true);
      const result = await computeProjectKpis(workspaceId, projectId);
      setSkipped(result.skipped ?? []);

      const computedValues = result.computed ?? [];
      if (computedValues.length > 0) {
        setValues(computedValues);
        const latest = computedValues.reduce((a, b) =>
          new Date(a.computedAt) > new Date(b.computedAt) ? a : b,
        );
        setLastComputedAt(latest.computedAt);
        const ev = latest.valueJson?.engineVersion;
        if (ev) setEngineVersion(String(ev));
      }

      toast.success(
        `Computed ${computedValues.length} KPIs, ${result.skipped?.length ?? 0} skipped`,
      );
    } catch (err: any) {
      console.error('Compute failed:', err);
      toast.error(err?.response?.data?.message || 'Compute failed');
    } finally {
      setComputing(false);
    }
  };

  const handleToggle = async (config: ProjectKpiConfig, enabled: boolean) => {
    if (!workspaceId || !projectId) return;
    try {
      await updateProjectKpiConfig(
        workspaceId,
        projectId,
        config.kpiDefinitionId,
        { enabled },
      );
      setConfigs((prev) =>
        prev.map((c) =>
          c.id === config.id ? { ...c, enabled } : c,
        ),
      );
    } catch (err: any) {
      console.error('Toggle failed:', err);
      const msg =
        err?.response?.data?.code === 'KPI_GOVERNANCE_DISABLED'
          ? 'Cannot enable: governance flag is disabled on this project'
          : 'Failed to update KPI';
      toast.error(msg);
    }
  };

  const handleTargetChange = (config: ProjectKpiConfig, value: string) => {
    const key = config.id;
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }
    debounceTimers.current[key] = setTimeout(async () => {
      if (!workspaceId || !projectId) return;
      try {
        await updateProjectKpiConfig(
          workspaceId,
          projectId,
          config.kpiDefinitionId,
          { targetValue: value || undefined },
        );
      } catch (err: any) {
        console.error('Target update failed:', err);
        toast.error('Failed to update target');
      }
    }, 400);
  };

  // Build rows
  const valuesMap = new Map<string, ProjectKpiValue>();
  for (const v of values) {
    valuesMap.set(v.kpiDefinitionId, v);
  }
  const skippedMap = new Map<string, SkippedKpi>();
  for (const s of skipped) {
    const cfg = configs.find(
      (c) => c.kpiDefinition?.code === s.kpiCode,
    );
    if (cfg) skippedMap.set(cfg.kpiDefinitionId, s);
  }

  const rows: KpiRow[] = configs.map((config) => {
    const latestValue = valuesMap.get(config.kpiDefinitionId) ?? null;
    const skippedInfo = skippedMap.get(config.kpiDefinitionId) ?? null;
    const status = determineStatus(config, latestValue, skippedInfo);
    return { config, latestValue, skippedInfo, status };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">KPI Configuration</h2>
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-0.5">
              {lastComputedAt && (
                <span>
                  Last computed:{' '}
                  {new Date(lastComputedAt).toLocaleString()}
                </span>
              )}
              {engineVersion && (
                <span className="font-mono">Engine v{engineVersion}</span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleCompute}
          disabled={computing}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {computing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Compute now
        </button>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">No KPIs configured</p>
          <p className="text-sm text-gray-400 mt-1">
            KPIs will appear here when configured via project templates or manual setup.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  KPI
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Enabled
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Target
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                  Value
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <KpiRowComponent
                  key={row.config.id}
                  row={row}
                  canWrite={canWrite}
                  onToggle={handleToggle}
                  onTargetChange={handleTargetChange}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Skipped KPIs info */}
      {skipped.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-amber-800 mb-2">
            Skipped KPIs ({skipped.length})
          </h3>
          <ul className="space-y-1">
            {skipped.map((s) => (
              <li key={s.kpiCode} className="text-sm text-amber-700">
                <span className="font-medium">{s.kpiName}</span>
                {' — '}
                {s.reason === 'GOVERNANCE_FLAG_DISABLED' ? (
                  <>
                    Disabled by project settings
                    <span className="ml-1 text-xs font-mono text-amber-600">
                      ({s.governanceFlag})
                    </span>
                  </>
                ) : (
                  s.reason
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

interface KpiRowProps {
  row: KpiRow;
  canWrite: boolean;
  onToggle: (config: ProjectKpiConfig, enabled: boolean) => void;
  onTargetChange: (config: ProjectKpiConfig, value: string) => void;
}

import { DECIMAL_2_RE } from '@/lib/validation/decimals';

const TARGET_REGEX = DECIMAL_2_RE;

function KpiRowComponent({ row, canWrite, onToggle, onTargetChange }: KpiRowProps) {
  const { config, latestValue, skippedInfo, status } = row;
  const def = config.kpiDefinition;

  const [targetInput, setTargetInput] = useState(
    config.target?.value != null ? String(config.target.value) : '',
  );
  const [targetError, setTargetError] = useState(false);

  const displayValue =
    latestValue?.valueNumeric != null
      ? formatNumeric(String(latestValue.valueNumeric), def?.unit)
      : '—';

  return (
    <tr className={`${!config.enabled ? 'opacity-60' : ''} hover:bg-gray-50`}>
      {/* KPI name + metadata */}
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">
            {def?.name ?? 'Unknown'}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400 font-mono">{def?.code}</span>
            <span className="text-xs text-gray-400 uppercase">{def?.category}</span>
            {def?.unit && (
              <span className="text-xs text-gray-400">({def.unit})</span>
            )}
          </div>
          {skippedInfo && (
            <span className="text-xs text-amber-600 mt-1">
              {skippedInfo.reason === 'GOVERNANCE_FLAG_DISABLED'
                ? `Requires ${skippedInfo.governanceFlag}`
                : skippedInfo.reason}
            </span>
          )}
        </div>
      </td>

      {/* Toggle */}
      <td className="px-4 py-3 text-center">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onToggle(config, e.target.checked)}
            disabled={!canWrite}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
        </label>
      </td>

      {/* Target */}
      <td className="px-4 py-3">
        <input
          type="text"
          value={targetInput}
          onChange={(e) => {
            const val = e.target.value;
            setTargetInput(val);
            if (val === '' || TARGET_REGEX.test(val)) {
              setTargetError(false);
              onTargetChange(config, val);
            } else {
              setTargetError(true);
            }
          }}
          disabled={!canWrite}
          placeholder="—"
          className={`w-full rounded border px-2 py-1 text-sm text-gray-700 disabled:bg-gray-50 disabled:cursor-not-allowed ${targetError ? 'border-red-400' : 'border-gray-200'}`}
        />
        {targetError && (
          <span className="text-xs text-red-500 mt-0.5 block">Numeric only</span>
        )}
      </td>

      {/* Value */}
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-mono text-gray-800">{displayValue}</span>
      </td>

      {/* Status */}
      <td className="px-4 py-3 text-center">{getStatusBadge(status)}</td>
    </tr>
  );
}

function formatNumeric(raw: string, unit?: string | null): string {
  const num = parseFloat(raw);
  if (isNaN(num)) return raw;

  if (unit === 'percent') return `${num.toFixed(1)}%`;
  if (unit === 'currency') return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (unit === 'days') return `${num.toFixed(1)}d`;

  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

export default ProjectKpisTab;
