import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { FileText, Plus, Edit, Archive, Copy, BarChart3, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/state/AuthContext';
import { TemplateKpiManager } from '@/features/kpis/components/TemplateKpiManager';
import { VALID_TAB_IDS, GOVERNANCE_FLAGS } from '@/features/templates/constants';

interface Template {
  id: string;
  name: string;
  description?: string;
  methodology?: string;
  deliveryMethod?: string;
  isActive: boolean;
  isSystem: boolean;
  isDefault: boolean;
  isPublished?: boolean;
  boundKpiCount?: number;
  defaultTabs?: string[];
  defaultGovernanceFlags?: Record<string, boolean>;
  taskTemplates?: Array<{
    name: string;
    description?: string;
    estimatedHours: number;
    phaseOrder?: number;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }>;
  phases?: Array<{
    name: string;
    description?: string;
    order: number;
    estimatedDurationDays?: number;
  }>;
}

const METHOD_BADGES: Record<string, { label: string; color: string }> = {
  SCRUM: { label: 'Scrum', color: 'bg-blue-100 text-blue-700' },
  KANBAN: { label: 'Kanban', color: 'bg-green-100 text-green-700' },
  WATERFALL: { label: 'Waterfall', color: 'bg-purple-100 text-purple-700' },
  HYBRID: { label: 'Hybrid', color: 'bg-amber-100 text-amber-700' },
};

// Use shared constants as single source of truth
const ALL_TAB_IDS = [...VALID_TAB_IDS];

const ALL_GOV_FLAGS = [...GOVERNANCE_FLAGS];

export default function AdminTemplatesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [kpiTemplateId, setKpiTemplateId] = useState<string | null>(null);
  const [kpiTemplateName, setKpiTemplateName] = useState('');

  useEffect(() => {
    loadTemplates();
  }, [showArchived]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await apiClient.get('/admin/templates');
      const allTemplates = Array.isArray(data) ? data : [];

      const filtered = showArchived
        ? allTemplates
        : allTemplates.filter((t: Template) => t.isActive !== false);

      setTemplates(filtered);
    } catch (err: any) {
      console.error('Failed to load templates:', err);
      setError(err?.response?.data?.message || 'Failed to load templates');
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (templateId: string) => {
    if (!confirm('Archive this template? It will no longer be available for new projects.')) return;
    try {
      await apiClient.delete(`/admin/templates/${templateId}`);
      toast.success('Template archived');
      loadTemplates();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to archive template');
    }
  };

  const handleClone = async (templateId: string) => {
    try {
      await apiClient.post(`/admin/templates/${templateId}/clone`);
      toast.success('Template cloned. Edit the copy to customize it.');
      loadTemplates();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to clone template');
    }
  };

  const handlePublishToggle = async (template: Template) => {
    const action = template.isPublished ? 'unpublish' : 'publish';
    try {
      await apiClient.post(`/admin/templates/${template.id}/${action}`);
      toast.success(`Template ${action === 'publish' ? 'published' : 'unpublished'}`);
      loadTemplates();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Failed to ${action} template`);
    }
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setShowCreateModal(true);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  const handleSave = async (templateData: Partial<Template>) => {
    try {
      if (editingTemplate?.id) {
        await apiClient.patch(`/admin/templates/${editingTemplate.id}`, templateData);
        toast.success('Template updated');
      } else {
        await apiClient.post('/admin/templates', templateData);
        toast.success('Template created');
      }
      setShowCreateModal(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save template');
      throw err;
    }
  };

  if (loading) {
    return <div className="space-y-6"><div className="text-gray-500">Loading templates...</div></div>;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-red-600">Error: {error}</div>
        <button onClick={loadTemplates} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Project Templates</h1>
          <p className="text-gray-500 mt-1">Manage and configure project templates</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="rounded" />
            Show archived
          </label>
          {isAdmin && (
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="h-4 w-4" />
              Create Template
            </button>
          )}
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">{showArchived ? 'No archived templates found' : 'No templates found'}</p>
          {isAdmin && !showArchived && (
            <button onClick={handleCreate} className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Create your first template
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{template.methodology || 'custom'}</p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {template.description || 'No description'}
              </p>

              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {template.deliveryMethod && METHOD_BADGES[template.deliveryMethod] && (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${METHOD_BADGES[template.deliveryMethod].color}`}>
                    {METHOD_BADGES[template.deliveryMethod].label}
                  </span>
                )}
                {template.isSystem && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">System</span>
                )}
                {template.isPublished === true && (
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-medium">Published</span>
                )}
                {template.isPublished === false && (
                  <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded text-xs font-medium">Draft</span>
                )}
                {!template.isActive && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Archived</span>
                )}
                {(template.boundKpiCount ?? 0) > 0 && (
                  <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs">{template.boundKpiCount} KPIs</span>
                )}
                {template.defaultTabs && template.defaultTabs.length > 0 && (
                  <span className="px-2 py-1 bg-gray-50 text-gray-600 rounded text-xs">{template.defaultTabs.length} tabs</span>
                )}
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2 pt-4 border-t flex-wrap">
                  {template.isSystem ? (
                    <button
                      onClick={() => handleClone(template.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                      Clone
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEdit(template)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handlePublishToggle(template)}
                        className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors ${
                          template.isPublished
                            ? 'text-yellow-600 hover:bg-yellow-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {template.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {template.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setKpiTemplateId(template.id);
                      setKpiTemplateName(template.name);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                  >
                    <BarChart3 className="h-4 w-4" />
                    KPIs
                  </button>
                  {!template.isSystem && template.isActive && (
                    <button
                      onClick={() => handleArchive(template.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 rounded transition-colors"
                    >
                      <Archive className="h-4 w-4" />
                      Archive
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <TemplateEditModal
          template={editingTemplate}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTemplate(null);
          }}
          onSave={handleSave}
        />
      )}

      {kpiTemplateId && (
        <TemplateKpiManager
          templateId={kpiTemplateId}
          templateName={kpiTemplateName}
          onClose={() => {
            setKpiTemplateId(null);
            setKpiTemplateName('');
          }}
        />
      )}
    </div>
  );
}

// ── Template Edit Modal (Wave 6) ─────────────────────────────────────

interface TemplateEditModalProps {
  template: Template | null;
  onClose: () => void;
  onSave: (data: Partial<Template>) => Promise<void>;
}

function TemplateEditModal({ template, onClose, onSave }: TemplateEditModalProps) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    deliveryMethod: template?.deliveryMethod || '',
    defaultTabs: template?.defaultTabs || [] as string[],
    defaultGovernanceFlags: template?.defaultGovernanceFlags || {} as Record<string, boolean>,
  });
  const [saving, setSaving] = useState(false);

  const toggleTab = (tabId: string) => {
    setFormData(prev => {
      const tabs = prev.defaultTabs.includes(tabId)
        ? prev.defaultTabs.filter(t => t !== tabId)
        : [...prev.defaultTabs, tabId];
      return { ...prev, defaultTabs: tabs };
    });
  };

  const toggleFlag = (key: string) => {
    setFormData(prev => ({
      ...prev,
      defaultGovernanceFlags: {
        ...prev.defaultGovernanceFlags,
        [key]: !prev.defaultGovernanceFlags[key],
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onSave({
        name: formData.name,
        description: formData.description || undefined,
        deliveryMethod: formData.deliveryMethod || undefined,
        defaultTabs: formData.defaultTabs.length > 0 ? formData.defaultTabs : undefined,
        defaultGovernanceFlags: Object.keys(formData.defaultGovernanceFlags).length > 0
          ? formData.defaultGovernanceFlags
          : undefined,
      });
    } catch {
      // handled upstream
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">
            {template ? 'Edit Template' : 'Create Template'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded border px-3 py-2"
              placeholder="Template name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded border px-3 py-2"
              rows={3}
              placeholder="Template description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Method</label>
            <select
              value={formData.deliveryMethod}
              onChange={(e) => setFormData({ ...formData, deliveryMethod: e.target.value })}
              className="w-full rounded border px-3 py-2"
            >
              <option value="">None</option>
              <option value="SCRUM">Scrum</option>
              <option value="KANBAN">Kanban</option>
              <option value="WATERFALL">Waterfall</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Tabs</label>
            <div className="grid grid-cols-3 gap-2">
              {ALL_TAB_IDS.map(tabId => (
                <label key={tabId} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.defaultTabs.includes(tabId)}
                    onChange={() => toggleTab(tabId)}
                    className="rounded"
                  />
                  <span className="capitalize">{tabId.replace('-', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Governance Flags</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_GOV_FLAGS.map(flag => (
                <label key={flag.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!formData.defaultGovernanceFlags[flag.key]}
                    onChange={() => toggleFlag(flag.key)}
                    className="rounded"
                  />
                  <span>{flag.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Saving...' : template ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
