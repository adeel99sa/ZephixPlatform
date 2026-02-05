/**
 * Template Center - Template Management UI
 * MVP: Create, edit, publish, and instantiate templates
 */

import { useState, useEffect, useMemo } from 'react';
import { listTemplates, updateTemplate, publishTemplate, TemplateDto, TemplateScope } from '@/features/templates/templates.api';
import { useAuth } from '@/state/AuthContext';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { useWorkspaceStore } from '@/state/workspace.store';
import { CreateTemplateModal } from './CreateTemplateModal';
import { TemplateStructureEditor } from './TemplateStructureEditor';
import { TemplateKpiSelector } from './TemplateKpiSelector';
import { InstantiateTemplateModal } from './InstantiateTemplateModal';

export default function TemplateCenterPage() {
  const [allTemplates, setAllTemplates] = useState<TemplateDto[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scopeFilter, setScopeFilter] = useState<'ALL' | TemplateScope>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInstantiateModal, setShowInstantiateModal] = useState(false);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTemplates();
      setAllTemplates(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // Filter templates in memory
  const templates = useMemo(() => {
    let filtered = [...allTemplates];

    // Scope filter
    if (scopeFilter !== 'ALL') {
      filtered = filtered.filter((t) => t.templateScope === scopeFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((t) =>
        t.name.toLowerCase().includes(query)
      );
    }

    // Sort by updatedAt desc
    filtered.sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });

    return filtered;
  }, [allTemplates, scopeFilter, searchQuery]);

  // Empty state
  const isEmpty = !loading && templates.length === 0 && !error;

  return (
    <div className="h-full flex">
      {/* Left Panel - Template List */}
      <div className="w-80 border-r bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <h1 className="text-xl font-semibold text-gray-900">Templates</h1>
        </div>

        {/* Filters */}
        <div className="p-4 border-b space-y-3">
          {/* Scope Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scope
            </label>
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as 'ALL' | TemplateScope)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All</option>
              <option value="SYSTEM">System</option>
              <option value="ORG">Org</option>
              <option value="WORKSPACE">Workspace</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* New Template Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
          >
            New Template
          </button>
        </div>

        {/* Template List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-4 text-sm text-gray-500">Loading templates...</div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md m-4">
              <p className="text-sm text-red-800 font-medium">Error loading templates</p>
              <p className="text-xs text-red-700 mt-1">{error}</p>
              <button
                onClick={loadTemplates}
                className="mt-2 text-xs text-red-700 hover:text-red-900 underline"
              >
                Retry
              </button>
            </div>
          )}

          {isEmpty && (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500">No templates found</p>
              <p className="text-xs text-gray-400 mt-1">
                Create your first template to get started
              </p>
            </div>
          )}

          {!loading && !error && templates.length > 0 && (
            <div className="divide-y">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                    selectedTemplate?.id === template.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900">{template.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {template.templateScope} • v{template.version}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Template Details */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedTemplate ? (
          <TemplateDetailsPanel 
            template={selectedTemplate} 
            onTemplateUpdate={(updated) => {
              // Update in list
              setAllTemplates((prev) =>
                prev.map((t) => (t.id === updated.id ? updated : t))
              );
              setSelectedTemplate(updated);
            }}
            onInstantiate={() => setShowInstantiateModal(true)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500">Select a template to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      <CreateTemplateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(template) => {
          // Refresh list and select new template
          loadTemplates();
          setSelectedTemplate(template);
          setShowCreateModal(false);
        }}
      />

      {/* Instantiate Template Modal */}
      {selectedTemplate && (
        <InstantiateTemplateModal
          open={showInstantiateModal}
          templateId={selectedTemplate.id}
          templateName={selectedTemplate.name}
          onClose={() => setShowInstantiateModal(false)}
        />
      )}
    </div>
  );
}

interface TemplateDetailsPanelProps {
  template: TemplateDto;
  onTemplateUpdate?: (template: TemplateDto) => void;
  onInstantiate?: () => void;
}

function TemplateDetailsPanel({ template, onTemplateUpdate, onInstantiate }: TemplateDetailsPanelProps) {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { isReadOnly } = useWorkspaceRole(activeWorkspaceId);
  
  const [structure, setStructure] = useState(template.structure || { phases: [] });
  const [defaultKpis, setDefaultKpis] = useState<string[]>(template.defaultEnabledKPIs || []);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [localTemplate, setLocalTemplate] = useState(template);

  // Update local template when prop changes
  useEffect(() => {
    setLocalTemplate(template);
    setStructure(template.structure || { phases: [] });
    setDefaultKpis(template.defaultEnabledKPIs || []);
  }, [template]);

  const handleStructureChange = (newStructure: typeof structure) => {
    setStructure(newStructure);
    setSaveError(null);
  };

  const handleSaveStructure = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateTemplate(localTemplate.id, { structure }, localTemplate.templateScope);
      setLocalTemplate(updated);
      // Optimistic UI - structure is already updated locally
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save structure');
      // Revert on error
      setStructure(localTemplate.structure || { phases: [] });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveKpis = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateTemplate(
        localTemplate.id,
        { defaultEnabledKPIs: defaultKpis },
        localTemplate.templateScope
      );
      setLocalTemplate(updated);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save KPIs');
      // Revert on error
      setDefaultKpis(localTemplate.defaultEnabledKPIs || []);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setSaveError(null);
    try {
      const updated = await publishTemplate(localTemplate.id, localTemplate.templateScope);
      setLocalTemplate(updated);
      // Notify parent to refresh list
      if (onTemplateUpdate) {
        onTemplateUpdate(updated);
      }
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to publish template');
    } finally {
      setPublishing(false);
    }
  };

  // Determine if publish button should be enabled
  const canPublish = (() => {
    // Admin can publish ORG templates
    if (localTemplate.templateScope === 'ORG' && user?.role === 'admin') {
      return true;
    }
    // Workspace Owner can publish WORKSPACE templates
    if (localTemplate.templateScope === 'WORKSPACE' && !isReadOnly) {
      // For MVP, rely on backend 403 if role is wrong
      return true;
    }
    return false;
  })();

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900">{template.name}</h2>
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${
              template.templateScope === 'SYSTEM'
                ? 'bg-purple-100 text-purple-800'
                : template.templateScope === 'ORG'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {template.templateScope}
          </span>
        </div>
        {template.description && (
          <p className="text-gray-600 mt-1">{template.description}</p>
        )}
      </div>

      {/* Metadata */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm font-medium text-gray-700">Version</div>
          <div className="text-sm text-gray-900">{template.version}</div>
        </div>
        {template.publishedAt && (
          <div>
            <div className="text-sm font-medium text-gray-700">Published</div>
            <div className="text-sm text-gray-900">
              {new Date(template.publishedAt).toLocaleDateString()}
            </div>
          </div>
        )}
        <div>
          <div className="text-sm font-medium text-gray-700">Updated</div>
          <div className="text-sm text-gray-900">
            {new Date(template.updatedAt).toLocaleDateString()}
          </div>
        </div>
        {template.methodology && (
          <div>
            <div className="text-sm font-medium text-gray-700">Methodology</div>
            <div className="text-sm text-gray-900">{template.methodology}</div>
          </div>
        )}
      </div>

      {/* Actions - Primary: Create Project from Template */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={onInstantiate}
          className="px-6 py-3 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
        >
          Create Project
        </button>
        <button
          onClick={() => {
            // TODO: Open edit modal
          }}
          className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Edit
        </button>
        <button
          onClick={handlePublish}
          disabled={!canPublish || publishing}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {publishing ? 'Publishing...' : 'Publish'}
        </button>
      </div>

      {/* Structure Editor */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Structure</h3>
        <TemplateStructureEditor
          structure={structure}
          onChange={handleStructureChange}
          onSave={handleSaveStructure}
          saving={saving}
          error={saveError}
        />
      </div>

      {/* Default KPIs */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Default KPIs</h3>
          <button
            onClick={handleSaveKpis}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save KPIs'}
          </button>
        </div>
        <TemplateKpiSelector selectedKpiIds={defaultKpis} onChange={setDefaultKpis} />
      </div>
    </div>
  );
}
