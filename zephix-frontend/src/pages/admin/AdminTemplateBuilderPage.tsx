import { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Save, ArrowLeft, GripVertical } from 'lucide-react';
import { templatesApi, ProjectTemplate } from '@/services/templates.api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Phase {
  name: string;
  description: string;
  order: number;
  estimatedDurationDays: number;
}

interface TaskTemplate {
  name: string;
  description: string;
  estimatedHours: number;
  phaseOrder: number;
  assigneeRole?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

interface KPIDefinition {
  id: string;
  name: string;
  description: string;
  methodology: 'agile' | 'waterfall' | 'kanban' | 'hybrid' | 'custom';
  calculationMethod?: string;
  unit?: string;
}

export default function AdminTemplateBuilderPage() {
  const navigate = useNavigate();
  const [template, setTemplate] = useState<Partial<ProjectTemplate>>({
    name: '',
    description: '',
    methodology: 'custom',
    scope: 'organization',
    phases: [],
    taskTemplates: [],
    availableKPIs: [],
    defaultEnabledKPIs: [],
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'phases' | 'tasks' | 'kpis'>('basic');

  const handleSave = async () => {
    if (!template.name) {
      toast.error('Please enter a template name');
      return;
    }

    try {
      setSaving(true);
      if (template.id) {
        await templatesApi.updateTemplate(template.id, template as any);
        toast.success('Template updated successfully');
      } else {
        await templatesApi.createTemplate(template as any);
        toast.success('Template created successfully');
        navigate('/admin/templates');
      }
    } catch (error: any) {
      console.error('Failed to save template:', error);
      toast.error(error?.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const addPhase = () => {
    const newPhase: Phase = {
      name: '',
      description: '',
      order: (template.phases?.length || 0) + 1,
      estimatedDurationDays: 7,
    };
    setTemplate({
      ...template,
      phases: [...(template.phases || []), newPhase],
    });
  };

  const updatePhase = (index: number, updates: Partial<Phase>) => {
    const phases = [...(template.phases || [])];
    phases[index] = { ...phases[index], ...updates };
    setTemplate({ ...template, phases });
  };

  const removePhase = (index: number) => {
    const phases = (template.phases || []).filter((_, i) => i !== index);
    setTemplate({ ...template, phases });
  };

  const addTask = () => {
    const newTask: TaskTemplate = {
      name: '',
      description: '',
      estimatedHours: 8,
      phaseOrder: 1,
      priority: 'medium',
    };
    setTemplate({
      ...template,
      taskTemplates: [...(template.taskTemplates || []), newTask],
    });
  };

  const updateTask = (index: number, updates: Partial<TaskTemplate>) => {
    const tasks = [...(template.taskTemplates || [])];
    tasks[index] = { ...tasks[index], ...updates };
    setTemplate({ ...template, taskTemplates: tasks });
  };

  const removeTask = (index: number) => {
    const tasks = (template.taskTemplates || []).filter((_, i) => i !== index);
    setTemplate({ ...template, taskTemplates: tasks });
  };

  const addKPI = () => {
    const newKPI: KPIDefinition = {
      id: `kpi-${Date.now()}`,
      name: '',
      description: '',
      methodology: template.methodology || 'custom',
    };
    setTemplate({
      ...template,
      availableKPIs: [...(template.availableKPIs || []), newKPI],
    });
  };

  const updateKPI = (index: number, updates: Partial<KPIDefinition>) => {
    const kpis = [...(template.availableKPIs || [])];
    kpis[index] = { ...kpis[index], ...updates };
    setTemplate({ ...template, availableKPIs: kpis });
  };

  const removeKPI = (index: number) => {
    const kpis = (template.availableKPIs || []).filter((_, i) => i !== index);
    setTemplate({ ...template, availableKPIs: kpis });
  };

  const toggleKPIEnabled = (kpiId: string) => {
    const enabled = template.defaultEnabledKPIs || [];
    const newEnabled = enabled.includes(kpiId)
      ? enabled.filter(id => id !== kpiId)
      : [...enabled, kpiId];
    setTemplate({ ...template, defaultEnabledKPIs: newEnabled });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/templates')}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Template Builder</h1>
            <p className="text-gray-500 mt-1">Create and configure project templates</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Template'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(['basic', 'phases', 'tasks', 'kpis'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Basic Information */}
      {activeTab === 'basic' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name *
            </label>
            <input
              type="text"
              value={template.name || ''}
              onChange={(e) => setTemplate({ ...template, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Agile Sprint Template"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={template.description || ''}
              onChange={(e) => setTemplate({ ...template, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Describe what this template is used for..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Methodology
              </label>
              <select
                value={template.methodology || 'custom'}
                onChange={(e) => setTemplate({ ...template, methodology: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="agile">Agile</option>
                <option value="waterfall">Waterfall</option>
                <option value="kanban">Kanban</option>
                <option value="hybrid">Hybrid</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scope
              </label>
              <select
                value={template.scope || 'organization'}
                onChange={(e) => setTemplate({ ...template, scope: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="organization">Organization</option>
                <option value="team">Team</option>
                <option value="personal">Personal</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Phases */}
      {activeTab === 'phases' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Project Phases</h2>
            <button
              onClick={addPhase}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Phase
            </button>
          </div>
          {(template.phases || []).map((phase, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Phase {index + 1}</span>
                </div>
                <button
                  onClick={() => removePhase(index)}
                  className="text-red-600 hover:text-red-900"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={phase.name}
                    onChange={(e) => updatePhase(index, { name: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                    placeholder="Phase name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Duration (days)</label>
                  <input
                    type="number"
                    value={phase.estimatedDurationDays}
                    onChange={(e) => updatePhase(index, { estimatedDurationDays: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={phase.description}
                  onChange={(e) => updatePhase(index, { description: e.target.value })}
                  rows={2}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                  placeholder="Phase description"
                />
              </div>
            </div>
          ))}
          {(!template.phases || template.phases.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No phases defined. Click "Add Phase" to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Tasks */}
      {activeTab === 'tasks' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Task Templates</h2>
            <button
              onClick={addTask}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </button>
          </div>
          {(template.taskTemplates || []).map((task, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Task {index + 1}</span>
                <button
                  onClick={() => removeTask(index)}
                  className="text-red-600 hover:text-red-900"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={task.name}
                    onChange={(e) => updateTask(index, { name: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                    placeholder="Task name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phase Order</label>
                  <input
                    type="number"
                    min="1"
                    value={task.phaseOrder}
                    onChange={(e) => updateTask(index, { phaseOrder: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    value={task.estimatedHours}
                    onChange={(e) => updateTask(index, { estimatedHours: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={task.priority || 'medium'}
                    onChange={(e) => updateTask(index, { priority: e.target.value as any })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={task.description}
                  onChange={(e) => updateTask(index, { description: e.target.value })}
                  rows={2}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                  placeholder="Task description"
                />
              </div>
            </div>
          ))}
          {(!template.taskTemplates || template.taskTemplates.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No task templates defined. Click "Add Task" to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      {activeTab === 'kpis' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">KPI Definitions</h2>
            <button
              onClick={addKPI}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add KPI
            </button>
          </div>
          {(template.availableKPIs || []).map((kpi, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(template.defaultEnabledKPIs || []).includes(kpi.id)}
                    onChange={() => toggleKPIEnabled(kpi.id)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable by default</span>
                </div>
                <button
                  onClick={() => removeKPI(index)}
                  className="text-red-600 hover:text-red-900"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">KPI Name</label>
                  <input
                    type="text"
                    value={kpi.name}
                    onChange={(e) => updateKPI(index, { name: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                    placeholder="KPI name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={kpi.unit || ''}
                    onChange={(e) => updateKPI(index, { unit: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                    placeholder="e.g., %, days, hours"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={kpi.description}
                  onChange={(e) => updateKPI(index, { description: e.target.value })}
                  rows={2}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                  placeholder="KPI description"
                />
              </div>
            </div>
          ))}
          {(!template.availableKPIs || template.availableKPIs.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No KPIs defined. Click "Add KPI" to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

