import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { templatesApi, ProjectTemplate, RiskPreset, KpiPreset } from '@/services/templates.api';
import { UseTemplateModal } from './components/UseTemplateModal';
import { toast } from 'sonner';
import { track } from '@/lib/telemetry';
import { useAuth } from '@/state/AuthContext';
import { Plus, Trash2, Save, Edit } from 'lucide-react';

export default function TemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [template, setTemplate] = useState<ProjectTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showUseModal, setShowUseModal] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [methodology, setMethodology] = useState<'agile' | 'waterfall' | 'kanban' | 'hybrid' | 'custom' | 'scrum'>('agile');
  const [structure, setStructure] = useState<{
    phases: Array<{
      name: string;
      description?: string;
      order: number;
      tasks: Array<{
        name: string;
        description?: string;
        estimatedHours?: number;
      }>;
    }>;
  }>({ phases: [] });

  // Phase 5: Risk and KPI presets state
  const [riskPresets, setRiskPresets] = useState<RiskPreset[]>([]);
  const [kpiPresets, setKpiPresets] = useState<KpiPreset[]>([]);
  const [editingRiskIndex, setEditingRiskIndex] = useState<number | null>(null);
  const [editingKpiIndex, setEditingKpiIndex] = useState<number | null>(null);

  // Permission check (Phase 4: Simple org role check, TODO: richer permission model)
  const canEdit = user?.role === 'admin' || user?.role === 'owner';

  useEffect(() => {
    if (id) {
      loadTemplate();
    }
  }, [id]);

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const data = await templatesApi.getTemplate(id!);
      if (!data) {
        toast.error('Template not found');
        navigate('/templates');
        return;
      }
      setTemplate(data);
      setName(data.name);
      setDescription(data.description || '');
      // Access category with type guard
      const dataRecord = data as unknown as Record<string, unknown>;
      setCategory(typeof dataRecord.category === 'string' ? dataRecord.category : '');
      setMethodology(data.methodology || 'agile');

      // Load structure if available, otherwise use legacy phases/taskTemplates
      const structureObj = dataRecord.structure as Record<string, unknown> | undefined;
      if (structureObj?.phases) {
        setStructure(structureObj as typeof structure);
      } else if (data.phases && data.taskTemplates) {
        // Convert legacy structure to new format
        const phasesMap = new Map<number, typeof structure.phases[0]>();
        data.phases.forEach((phase) => {
          phasesMap.set(phase.order, {
            name: phase.name,
            description: phase.description,
            order: phase.order,
            tasks: [],
          });
        });
        data.taskTemplates.forEach((task) => {
          const phase = phasesMap.get(task.phaseOrder);
          if (phase) {
            phase.tasks.push({
              name: task.name,
              description: task.description,
              estimatedHours: task.estimatedHours,
            });
          }
        });
        setStructure({ phases: Array.from(phasesMap.values()).sort((a, b) => a.order - b.order) });
      } else {
        setStructure({ phases: [] });
      }

      // Phase 5: Load risk and KPI presets
      setRiskPresets((data as any).riskPresets || []);
      setKpiPresets((data as any).kpiPresets || []);
    } catch (error: any) {
      console.error('Failed to load template:', error);
      toast.error('Failed to load template');
      navigate('/templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      // Convert structure back to legacy format if needed, or use new structure field
      const updateData: any = {
        name,
        description,
        methodology,
        structure, // Phase 4: Use new structure format
        riskPresets, // Phase 5: Include risk presets
        kpiPresets, // Phase 5: Include KPI presets
      };
      if (category) updateData.category = category;

      await templatesApi.updateTemplate(id, updateData);
      toast.success('Template updated successfully');
      track('template.updated', { templateId: id });
      loadTemplate();
    } catch (error: any) {
      console.error('Failed to update template:', error);
      toast.error(error?.response?.data?.message || 'Failed to update template');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPhase = () => {
    const newOrder = structure.phases.length > 0
      ? Math.max(...structure.phases.map(p => p.order)) + 1
      : 1;
    setStructure({
      phases: [
        ...structure.phases,
        {
          name: `Phase ${newOrder}`,
          description: '',
          order: newOrder,
          tasks: [],
        },
      ],
    });
  };

  const handleUpdatePhase = (index: number, updates: Partial<typeof structure.phases[0]>) => {
    const newPhases = [...structure.phases];
    const currentPhase = newPhases[index];
    if (currentPhase) {
      newPhases[index] = { ...currentPhase, ...updates };
      setStructure({ phases: newPhases });
    }
  };

  const handleDeletePhase = (index: number) => {
    if (confirm('Are you sure you want to delete this phase? All tasks in this phase will also be deleted.')) {
      const newPhases = structure.phases.filter((_, i) => i !== index);
      setStructure({ phases: newPhases });
    }
  };

  const handleAddTask = (phaseIndex: number) => {
    const newPhases = [...structure.phases];
    newPhases[phaseIndex].tasks.push({
      name: 'New Task',
      description: '',
      estimatedHours: 0,
    });
    setStructure({ phases: newPhases });
  };

  const handleUpdateTask = (phaseIndex: number, taskIndex: number, updates: Partial<typeof structure.phases[0]['tasks'][0]>) => {
    const newPhases = [...structure.phases];
    const phase = newPhases[phaseIndex];
    const task = phase?.tasks[taskIndex];
    if (phase && task) {
      newPhases[phaseIndex].tasks[taskIndex] = {
        ...task,
        ...updates,
      };
      setStructure({ phases: newPhases });
    }
  };

  const handleDeleteTask = (phaseIndex: number, taskIndex: number) => {
    const newPhases = [...structure.phases];
    newPhases[phaseIndex].tasks = newPhases[phaseIndex].tasks.filter((_, i) => i !== taskIndex);
    setStructure({ phases: newPhases });
  };

  // Phase 5: Risk preset handlers
  const handleAddRisk = () => {
    const newRisk: RiskPreset = {
      id: `risk-${Date.now()}`,
      title: '',
      description: '',
      category: '',
      severity: 'medium',
      probability: 50,
      tags: [],
    };
    setRiskPresets([...riskPresets, newRisk]);
    setEditingRiskIndex(riskPresets.length);
  };

  const handleUpdateRisk = (index: number, updates: Partial<RiskPreset>) => {
    const newRisks = [...riskPresets];
    newRisks[index] = { ...newRisks[index], ...updates };
    setRiskPresets(newRisks);
  };

  const handleDeleteRisk = (index: number) => {
    if (confirm('Are you sure you want to delete this risk preset?')) {
      setRiskPresets(riskPresets.filter((_, i) => i !== index));
      if (editingRiskIndex === index) setEditingRiskIndex(null);
      else if (editingRiskIndex !== null && editingRiskIndex > index) {
        setEditingRiskIndex(editingRiskIndex - 1);
      }
    }
  };

  // Phase 5: KPI preset handlers
  const handleAddKpi = () => {
    const newKpi: KpiPreset = {
      id: `kpi-${Date.now()}`,
      name: '',
      description: '',
      metricType: '',
      unit: '',
      targetValue: 0,
      direction: 'higher_is_better',
    };
    setKpiPresets([...kpiPresets, newKpi]);
    setEditingKpiIndex(kpiPresets.length);
  };

  const handleUpdateKpi = (index: number, updates: Partial<KpiPreset>) => {
    const newKpis = [...kpiPresets];
    newKpis[index] = { ...newKpis[index], ...updates };
    setKpiPresets(newKpis);
  };

  const handleDeleteKpi = (index: number) => {
    if (confirm('Are you sure you want to delete this KPI preset?')) {
      setKpiPresets(kpiPresets.filter((_, i) => i !== index));
      if (editingKpiIndex === index) setEditingKpiIndex(null);
      else if (editingKpiIndex !== null && editingKpiIndex > index) {
        setEditingKpiIndex(editingKpiIndex - 1);
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="template-detail-root">
        <div className="text-center text-gray-500">Loading template...</div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-6" data-testid="template-detail-root">
        <div className="text-center text-red-500">Template not found</div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="template-detail-root">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/templates')}
            className="text-gray-600 hover:text-gray-900 mb-2"
          >
            ← Back to Template Center
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Template Details</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowUseModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Use in workspace
          </button>
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              data-testid="template-save-button"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6 max-w-4xl">
        {/* Basic Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEdit}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                data-testid="template-name-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!canEdit}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                data-testid="template-description-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={!canEdit}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  data-testid="template-category-select"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Methodology
                </label>
                <select
                  value={methodology}
                  onChange={(e) => setMethodology(e.target.value as any)}
                  disabled={!canEdit}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  data-testid="template-methodology-select"
                >
                  <option value="agile">Agile</option>
                  <option value="waterfall">Waterfall</option>
                  <option value="scrum">Scrum</option>
                  <option value="kanban">Kanban</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Structure Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6" data-testid="template-structure-section">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Project Structure</h2>
            {canEdit && (
              <button
                onClick={handleAddPhase}
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Phase
              </button>
            )}
          </div>

          {structure.phases.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No phases defined. {canEdit && 'Click "Add Phase" to get started.'}
            </div>
          ) : (
            <div className="space-y-4">
              {structure.phases.map((phase, phaseIndex) => (
                <div
                  key={phaseIndex}
                  className="border border-gray-200 rounded-md p-4"
                  data-testid="template-structure-phase-row"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 space-y-2">
                      {canEdit ? (
                        <>
                          <input
                            type="text"
                            value={phase.name}
                            onChange={(e) => handleUpdatePhase(phaseIndex, { name: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm font-medium"
                            placeholder="Phase name"
                          />
                          <textarea
                            value={phase.description || ''}
                            onChange={(e) => handleUpdatePhase(phaseIndex, { description: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                            placeholder="Phase description"
                            rows={2}
                          />
                        </>
                      ) : (
                        <>
                          <h3 className="font-medium">{phase.name}</h3>
                          {phase.description && <p className="text-sm text-gray-600">{phase.description}</p>}
                        </>
                      )}
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => handleDeletePhase(phaseIndex)}
                        className="ml-2 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="ml-4 space-y-2">
                    {phase.tasks.map((task, taskIndex) => (
                      <div
                        key={taskIndex}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                        data-testid="template-structure-task-row"
                      >
                        {canEdit ? (
                          <>
                            <input
                              type="text"
                              value={task.name}
                              onChange={(e) => handleUpdateTask(phaseIndex, taskIndex, { name: e.target.value })}
                              className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-sm"
                              placeholder="Task name"
                            />
                            <input
                              type="number"
                              value={task.estimatedHours || 0}
                              onChange={(e) => handleUpdateTask(phaseIndex, taskIndex, { estimatedHours: parseFloat(e.target.value) || 0 })}
                              className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm"
                              placeholder="Hours"
                            />
                            <button
                              onClick={() => handleDeleteTask(phaseIndex, taskIndex)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm">{task.name}</span>
                            {task.estimatedHours && (
                              <span className="text-xs text-gray-500">{task.estimatedHours}h</span>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                    {canEdit && (
                      <button
                        onClick={() => handleAddTask(phaseIndex)}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Add Task
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Phase 5: Risk Presets Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6" data-testid="template-risk-presets-section">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Risk Presets</h2>
            {canEdit && (
              <button
                onClick={handleAddRisk}
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 flex items-center gap-2"
                data-testid="template-risk-add-button"
              >
                <Plus className="h-4 w-4" />
                Add Risk Preset
              </button>
            )}
          </div>

          {riskPresets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No risk presets defined. {canEdit && 'Click "Add Risk Preset" to get started.'}
            </div>
          ) : (
            <div className="space-y-3">
              {riskPresets.map((risk, index) => (
                <div
                  key={risk.id}
                  className="border border-gray-200 rounded-md p-4"
                  data-testid="template-risk-preset-row"
                >
                  {canEdit && editingRiskIndex === index ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                        <input
                          type="text"
                          value={risk.title}
                          onChange={(e) => handleUpdateRisk(index, { title: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                          placeholder="Risk title"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={risk.description || ''}
                          onChange={(e) => handleUpdateRisk(index, { description: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                          <input
                            type="text"
                            value={risk.category || ''}
                            onChange={(e) => handleUpdateRisk(index, { category: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Severity *</label>
                          <select
                            value={risk.severity}
                            onChange={(e) => handleUpdateRisk(index, { severity: e.target.value as any })}
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                            required
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Probability (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={risk.probability || 50}
                            onChange={(e) => handleUpdateRisk(index, { probability: parseInt(e.target.value) || 0 })}
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingRiskIndex(null)}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Done
                        </button>
                        <button
                          onClick={() => handleDeleteRisk(index)}
                          className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                          data-testid="template-risk-delete-button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{risk.title || 'Untitled Risk'}</div>
                        {risk.description && <div className="text-sm text-gray-600 mt-1">{risk.description}</div>}
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          {risk.category && <span>Category: {risk.category}</span>}
                          <span>Severity: {risk.severity}</span>
                          {risk.probability !== undefined && <span>Probability: {risk.probability}%</span>}
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingRiskIndex(index)}
                            className="text-blue-600 hover:text-blue-800"
                            data-testid="template-risk-edit-button"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRisk(index)}
                            className="text-red-600 hover:text-red-800"
                            data-testid="template-risk-delete-button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Phase 5: KPI Presets Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6" data-testid="template-kpi-presets-section">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">KPI Presets</h2>
            {canEdit && (
              <button
                onClick={handleAddKpi}
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 flex items-center gap-2"
                data-testid="template-kpi-add-button"
              >
                <Plus className="h-4 w-4" />
                Add KPI Preset
              </button>
            )}
          </div>

          {kpiPresets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No KPI presets defined. {canEdit && 'Click "Add KPI Preset" to get started.'}
            </div>
          ) : (
            <div className="space-y-3">
              {kpiPresets.map((kpi, index) => (
                <div
                  key={kpi.id}
                  className="border border-gray-200 rounded-md p-4"
                  data-testid="template-kpi-preset-row"
                >
                  {canEdit && editingKpiIndex === index ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                        <input
                          type="text"
                          value={kpi.name}
                          onChange={(e) => handleUpdateKpi(index, { name: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                          placeholder="KPI name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={kpi.description || ''}
                          onChange={(e) => handleUpdateKpi(index, { description: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Metric Type *</label>
                          <input
                            type="text"
                            value={kpi.metricType}
                            onChange={(e) => handleUpdateKpi(index, { metricType: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Unit *</label>
                          <input
                            type="text"
                            value={kpi.unit}
                            onChange={(e) => handleUpdateKpi(index, { unit: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Target Value</label>
                          <input
                            type="number"
                            value={typeof kpi.targetValue === 'number' ? kpi.targetValue : kpi.targetValue || ''}
                            onChange={(e) => handleUpdateKpi(index, { targetValue: parseFloat(e.target.value) || 0 })}
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Direction *</label>
                          <select
                            value={kpi.direction}
                            onChange={(e) => handleUpdateKpi(index, { direction: e.target.value as any })}
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                            required
                          >
                            <option value="higher_is_better">Higher is Better</option>
                            <option value="lower_is_better">Lower is Better</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingKpiIndex(null)}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Done
                        </button>
                        <button
                          onClick={() => handleDeleteKpi(index)}
                          className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                          data-testid="template-kpi-delete-button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{kpi.name || 'Untitled KPI'}</div>
                        {kpi.description && <div className="text-sm text-gray-600 mt-1">{kpi.description}</div>}
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>Type: {kpi.metricType}</span>
                          <span>Unit: {kpi.unit}</span>
                          {kpi.targetValue !== undefined && <span>Target: {kpi.targetValue}</span>}
                          <span>Direction: {kpi.direction === 'higher_is_better' ? 'Higher is Better' : 'Lower is Better'}</span>
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingKpiIndex(index)}
                            className="text-blue-600 hover:text-blue-800"
                            data-testid="template-kpi-edit-button"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteKpi(index)}
                            className="text-red-600 hover:text-red-800"
                            data-testid="template-kpi-delete-button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Use Template Modal */}
      {template && (
        <UseTemplateModal
          open={showUseModal}
          onClose={() => setShowUseModal(false)}
          templateId={template.id}
          templateName={template.name}
        />
      )}
    </div>
  );
}

