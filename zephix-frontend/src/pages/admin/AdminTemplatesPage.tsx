import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { FileText, Plus, Edit, Archive, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/state/AuthContext';

interface Template {
  id: string;
  name: string;
  description?: string;
  methodology: string;
  isActive: boolean;
  isSystem: boolean;
  isDefault: boolean;
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

export default function AdminTemplatesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, [showArchived]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await apiClient.get('/admin/templates');
      const allTemplates = Array.isArray(data) ? data : [];

      // Filter by isActive unless showing archived
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
    if (!confirm('Are you sure you want to archive this template? It will no longer be available for new projects.')) {
      return;
    }

    try {
      await apiClient.delete(`/admin/templates/${templateId}`);
      toast.success('Template archived successfully');
      loadTemplates();
    } catch (err: any) {
      console.error('Failed to archive template:', err);
      toast.error(err?.response?.data?.message || 'Failed to archive template');
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
        toast.success('Template updated successfully');
      } else {
        await apiClient.post('/admin/templates', templateData);
        toast.success('Template created successfully');
      }
      setShowCreateModal(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (err: any) {
      console.error('Failed to save template:', err);
      toast.error(err?.response?.data?.message || 'Failed to save template');
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-gray-500">Loading templates...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-red-600">Error: {error}</div>
        <button
          onClick={loadTemplates}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
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
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded"
            />
            Show archived
          </label>
          {isAdmin && (
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Template
            </button>
          )}
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">
            {showArchived ? 'No archived templates found' : 'No templates found'}
          </p>
          {isAdmin && !showArchived && (
            <button
              onClick={handleCreate}
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create your first template
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{template.methodology}</p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {template.description || 'No description'}
              </p>

              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {template.isSystem && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    System
                  </span>
                )}
                {template.isDefault && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    Default
                  </span>
                )}
                {!template.isActive && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                    Archived
                  </span>
                )}
                {template.taskTemplates && template.taskTemplates.length > 0 && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    {template.taskTemplates.length} tasks
                  </span>
                )}
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2 pt-4 border-t">
                  <button
                    onClick={() => handleEdit(template)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  {template.isActive && (
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
        <TemplateFormModal
          template={editingTemplate}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTemplate(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// Template Form Modal Component
interface TemplateFormModalProps {
  template: Template | null;
  onClose: () => void;
  onSave: (data: Partial<Template>) => Promise<void>;
}

function TemplateFormModal({ template, onClose, onSave }: TemplateFormModalProps) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    methodology: template?.methodology || 'agile',
    isActive: template?.isActive !== false,
    taskTemplates: JSON.stringify(template?.taskTemplates || [], null, 2),
  });
  const [saving, setSaving] = useState(false);
  const [taskTemplatesError, setTaskTemplatesError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate taskTemplates JSON
    let parsedTaskTemplates: any[] = [];
    if (formData.taskTemplates.trim()) {
      try {
        parsedTaskTemplates = JSON.parse(formData.taskTemplates);
        if (!Array.isArray(parsedTaskTemplates)) {
          setTaskTemplatesError('Task templates must be a JSON array');
          return;
        }
        setTaskTemplatesError(null);
      } catch (err) {
        setTaskTemplatesError('Invalid JSON format');
        return;
      }
    }

    try {
      setSaving(true);
      await onSave({
        name: formData.name,
        description: formData.description || undefined,
        methodology: formData.methodology,
        isActive: formData.isActive,
        taskTemplates: parsedTaskTemplates,
      });
    } catch (err) {
      // Error already handled in onSave
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded border px-3 py-2"
              rows={3}
              placeholder="Template description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Methodology <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.methodology}
              onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
              className="w-full rounded border px-3 py-2"
            >
              <option value="agile">Agile</option>
              <option value="waterfall">Waterfall</option>
              <option value="hybrid">Hybrid</option>
              <option value="kanban">Kanban</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Templates (JSON)
            </label>
            <textarea
              value={formData.taskTemplates}
              onChange={(e) => {
                setFormData({ ...formData, taskTemplates: e.target.value });
                setTaskTemplatesError(null);
              }}
              className={`w-full rounded border px-3 py-2 font-mono text-sm ${
                taskTemplatesError ? 'border-red-500' : ''
              }`}
              rows={8}
              placeholder='[{"name": "Setup environment", "estimatedHours": 8}, {"name": "Implement core feature", "estimatedHours": 40}]'
            />
            {taskTemplatesError && (
              <p className="text-red-500 text-sm mt-1">{taskTemplatesError}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              JSON array of task objects with: name, description (optional), estimatedHours, priority (optional)
            </p>
          </div>

          {template && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                Active (uncheck to archive)
              </label>
            </div>
          )}

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
