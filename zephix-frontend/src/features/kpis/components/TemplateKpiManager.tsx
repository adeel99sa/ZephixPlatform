/**
 * TemplateKpiManager
 *
 * Modal panel for managing KPI bindings on a template.
 * - Lists existing template KPIs
 * - Add KPI from definitions list with defaultTarget and isRequired
 * - Remove KPI
 */

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { X, Plus, Trash2, BarChart3, Loader2, Package } from 'lucide-react';
import {
  listTemplateKpis,
  assignTemplateKpi,
  removeTemplateKpi,
  listKpiPacks,
  applyKpiPack,
  type TemplateKpi,
  type KpiPackMeta,
} from '../api/templateKpis.api';
import {
  listKpiDefinitions,
  type KpiDefinition,
} from '../api/kpiDefinitions.api';

interface Props {
  templateId: string;
  templateName: string;
  onClose: () => void;
}

export function TemplateKpiManager({ templateId, templateName, onClose }: Props) {
  const [templateKpis, setTemplateKpis] = useState<TemplateKpi[]>([]);
  const [definitions, setDefinitions] = useState<KpiDefinition[]>([]);
  const [packs, setPacks] = useState<KpiPackMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [applyingPack, setApplyingPack] = useState(false);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDefId, setSelectedDefId] = useState('');
  const [defaultTarget, setDefaultTarget] = useState('');
  const [isRequired, setIsRequired] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [kpis, defs, packsList] = await Promise.all([
        listTemplateKpis(templateId),
        listKpiDefinitions(),
        listKpiPacks(templateId),
      ]);
      setTemplateKpis(kpis);
      setDefinitions(defs);
      setPacks(packsList);
    } catch (err: any) {
      console.error('Failed to load template KPIs:', err);
      toast.error('Failed to load template KPI data');
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    load();
  }, [load]);

  const assignedIds = new Set(templateKpis.map((tk) => tk.kpiDefinitionId));
  const availableDefs = definitions.filter((d) => !assignedIds.has(d.id));

  const handleAdd = async () => {
    if (!selectedDefId) return;

    try {
      setAdding(true);
      await assignTemplateKpi(templateId, {
        kpiDefinitionId: selectedDefId,
        isRequired,
        defaultTarget: defaultTarget || undefined,
      });
      toast.success('KPI assigned to template');
      setShowAddForm(false);
      setSelectedDefId('');
      setDefaultTarget('');
      setIsRequired(false);
      await load();
    } catch (err: any) {
      console.error('Failed to assign KPI:', err);
      toast.error(err?.response?.data?.message || 'Failed to assign KPI');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (kpiDefinitionId: string) => {
    try {
      await removeTemplateKpi(templateId, kpiDefinitionId);
      toast.success('KPI removed from template');
      await load();
    } catch (err: any) {
      console.error('Failed to remove KPI:', err);
      toast.error('Failed to remove KPI from template');
    }
  };

  const handleApplyPack = async (packCode: string) => {
    try {
      setApplyingPack(true);
      const result = await applyKpiPack(templateId, packCode);
      setTemplateKpis(result);
      toast.success('KPI pack applied');
    } catch (err: any) {
      console.error('Failed to apply KPI pack:', err);
      toast.error(err?.response?.data?.message || 'Failed to apply KPI pack');
    } finally {
      setApplyingPack(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Template KPIs</h2>
              <p className="text-sm text-gray-500">{templateName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              {/* Assigned KPIs list */}
              {templateKpis.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No KPIs assigned</p>
                  <p className="text-sm mt-1">
                    Add KPIs that will auto-activate when projects use this template.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {templateKpis.map((tk) => (
                    <div
                      key={tk.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900">
                            {tk.kpiDefinition?.name ?? tk.kpiDefinitionId}
                          </span>
                          {tk.isRequired && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                              Required
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="uppercase">
                            {tk.kpiDefinition?.category ?? ''}
                          </span>
                          {tk.defaultTarget && (
                            <span>Target: {tk.defaultTarget}</span>
                          )}
                          <span className="font-mono">
                            {tk.kpiDefinition?.code ?? ''}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemove(tk.kpiDefinitionId)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Remove KPI"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Apply KPI Pack */}
              {packs.length > 0 && (
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-400" />
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleApplyPack(e.target.value);
                      e.target.value = '';
                    }}
                    disabled={applyingPack}
                    className="flex-1 rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-700 bg-white"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      {applyingPack ? 'Applying...' : 'Apply KPI pack...'}
                    </option>
                    {packs.map((p) => (
                      <option key={p.packCode} value={p.packCode}>
                        {p.name} ({p.kpiCount} KPIs)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Add form */}
              {showAddForm ? (
                <div className="border rounded-lg p-4 space-y-3 bg-indigo-50/50">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      KPI Definition
                    </label>
                    <select
                      value={selectedDefId}
                      onChange={(e) => setSelectedDefId(e.target.value)}
                      className="w-full rounded border px-3 py-2 text-sm"
                    >
                      <option value="">Select a KPI...</option>
                      {availableDefs.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.category} &middot; {d.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Target (optional)
                      </label>
                      <input
                        type="text"
                        value={defaultTarget}
                        onChange={(e) => setDefaultTarget(e.target.value)}
                        className="w-full rounded border px-3 py-2 text-sm"
                        placeholder="e.g. 95"
                      />
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={isRequired}
                          onChange={(e) => setIsRequired(e.target.checked)}
                          className="rounded"
                        />
                        Required
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleAdd}
                      disabled={!selectedDefId || adding}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {adding ? 'Adding...' : 'Add KPI'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setSelectedDefId('');
                        setDefaultTarget('');
                        setIsRequired(false);
                      }}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddForm(true)}
                  disabled={availableDefs.length === 0}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg border border-dashed border-indigo-300 w-full justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                  {availableDefs.length === 0
                    ? 'All KPIs assigned'
                    : 'Add KPI to template'}
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
