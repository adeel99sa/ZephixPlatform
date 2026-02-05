import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Type, Hash, Calendar, CheckSquare, List, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { AdminErrorState } from './_components/AdminErrorState';

interface CustomField {
  id?: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'textarea';
  required: boolean;
  defaultValue?: any;
  options?: string[]; // For select/multiselect
  placeholder?: string;
  helpText?: string;
  scope: 'project' | 'task' | 'workspace' | 'all';
}

export default function AdminCustomFieldsPage() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);

  useEffect(() => {
    loadCustomFields();
  }, []);

  const [error, setError] = useState<string | null>(null);

  const loadCustomFields = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<{ data: any[] }>('/admin/custom-fields');
      const data = (response as unknown as { data?: any[] })?.data ?? [];
      // Map backend response to frontend format
      const mappedFields = data.map((field: any) => ({
        id: field.id,
        name: field.name,
        label: field.label,
        type: field.type,
        required: field.isRequired,
        defaultValue: field.defaultValue,
        options: field.options || [],
        placeholder: field.placeholder,
        helpText: field.helpText,
        scope: field.scope,
      }));
      setFields(mappedFields);
    } catch (err: any) {
      console.error('Failed to load custom fields:', err);
      // Don't redirect - show inline error
      const errorMsg = err?.response?.data?.message || 'Failed to load custom fields';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingField || !editingField.name || !editingField.label) {
      toast.error('Name and label are required');
      return;
    }

    try {
      setSaving(true);
      // Map frontend format to backend format
      const payload = {
        name: editingField.name,
        label: editingField.label,
        type: editingField.type,
        isRequired: editingField.required,
        defaultValue: editingField.defaultValue,
        options: editingField.options && editingField.options.length > 0 ? editingField.options : undefined,
        placeholder: editingField.placeholder,
        helpText: editingField.helpText,
        scope: editingField.scope,
        isActive: true,
      };

      if (editingField.id) {
        // Update existing
        await apiClient.patch(`/admin/custom-fields/${editingField.id}`, payload);
        toast.success('Custom field updated successfully');
      } else {
        // Create new
        await apiClient.post('/admin/custom-fields', payload);
        toast.success('Custom field created successfully');
      }

      setShowAddModal(false);
      setEditingField(null);
      loadCustomFields();
    } catch (error: any) {
      console.error('Failed to save custom field:', error);
      toast.error(error?.response?.data?.message || 'Failed to save custom field');
    } finally {
      setSaving(false);
    }
  };

  const handleAddField = () => {
    const newField: CustomField = {
      name: '',
      label: '',
      type: 'text',
      required: false,
      scope: 'all',
    };
    setEditingField(newField);
    setShowAddModal(true);
  };

  const handleEditField = (field: CustomField) => {
    setEditingField(field);
    setShowAddModal(true);
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this custom field?')) return;

    try {
      await apiClient.delete(`/admin/custom-fields/${fieldId}`);
      setFields(fields.filter(f => f.id !== fieldId));
      toast.success('Custom field deleted');
      loadCustomFields(); // Reload to ensure consistency
    } catch (error: any) {
      console.error('Failed to delete custom field:', error);
      toast.error(error?.response?.data?.message || 'Failed to delete custom field');
    }
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'text':
      case 'textarea':
        return <FileText className="h-4 w-4" />;
      case 'number':
        return <Hash className="h-4 w-4" />;
      case 'date':
        return <Calendar className="h-4 w-4" />;
      case 'boolean':
        return <CheckSquare className="h-4 w-4" />;
      case 'select':
      case 'multiselect':
        return <List className="h-4 w-4" />;
      default:
        return <Type className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Custom Fields</h1>
          <p className="text-gray-500 mt-1">Define custom fields for projects, tasks, and workspaces</p>
        </div>
        <div className="text-gray-500">Loading custom fields...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Custom Fields</h1>
          <p className="text-gray-500 mt-1">Define custom fields for projects, tasks, and workspaces</p>
        </div>
        <button
          onClick={handleAddField}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Field
        </button>
      </div>

      {error && (
        <AdminErrorState
          error={error}
          onRetry={loadCustomFields}
          title="Failed to load custom fields"
        />
      )}

      {/* Custom Fields List */}
      {!error && fields.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scope</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Required</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fields.map((field) => (
                <tr key={field.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-gray-400 mr-2">{getFieldIcon(field.type)}</div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{field.label}</div>
                        <div className="text-sm text-gray-500">{field.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {field.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {field.scope}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {field.required ? (
                      <span className="text-green-600">Yes</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEditField(field)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => field.id && handleDeleteField(field.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Type className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 mb-2">No custom fields defined</p>
          <p className="text-sm text-gray-400 mb-4">
            Create custom fields to capture additional information for your projects, tasks, and workspaces.
          </p>
          <button
            onClick={handleAddField}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Custom Field
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && editingField && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {editingField.id ? 'Edit Custom Field' : 'Add Custom Field'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Field Name (internal) *
                </label>
                <input
                  type="text"
                  value={editingField.name}
                  onChange={(e) => setEditingField({ ...editingField, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., client_name"
                />
                <p className="text-xs text-gray-500 mt-1">Lowercase, no spaces. Used in API and templates.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Label *
                </label>
                <input
                  type="text"
                  value={editingField.label}
                  onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Client Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Field Type *
                  </label>
                  <select
                    value={editingField.type}
                    onChange={(e) => setEditingField({ ...editingField, type: e.target.value as any, options: e.target.value.includes('select') ? [] : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="text">Text</option>
                    <option value="textarea">Textarea</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="boolean">Boolean (Checkbox)</option>
                    <option value="select">Select (Single)</option>
                    <option value="multiselect">Select (Multiple)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scope *
                  </label>
                  <select
                    value={editingField.scope}
                    onChange={(e) => setEditingField({ ...editingField, scope: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">All</option>
                    <option value="project">Projects Only</option>
                    <option value="task">Tasks Only</option>
                    <option value="workspace">Workspaces Only</option>
                  </select>
                </div>
              </div>

              {(editingField.type === 'select' || editingField.type === 'multiselect') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Options (one per line) *
                  </label>
                  <textarea
                    value={(editingField.options || []).join('\n')}
                    onChange={(e) => setEditingField({ ...editingField, options: e.target.value.split('\n').filter(o => o.trim()) })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                  />
                </div>
              )}

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingField.required}
                    onChange={(e) => setEditingField({ ...editingField, required: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Required field</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Placeholder Text
                </label>
                <input
                  type="text"
                  value={editingField.placeholder || ''}
                  onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter placeholder text..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Help Text
                </label>
                <textarea
                  value={editingField.helpText || ''}
                  onChange={(e) => setEditingField({ ...editingField, helpText: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Help text shown below the field"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingField(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editingField.name || !editingField.label}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Field'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

