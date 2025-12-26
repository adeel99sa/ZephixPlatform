import { useState } from 'react';
import { templatesApi, CreateTemplateDto } from '@/services/templates.api';
import { useUIStore } from '@/stores/uiStore';

interface TemplateCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function TemplateCreateModal({ open, onClose, onCreated }: TemplateCreateModalProps) {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateTemplateDto>({
    name: '',
    description: '',
    methodology: 'agile',
    scope: 'organization',
    phases: [],
    taskTemplates: [],
    availableKPIs: [],
    defaultEnabledKPIs: [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Template name is required',
      });
      return;
    }

    setLoading(true);
    try {
      await templatesApi.createTemplate(formData);
      addToast({
        type: 'success',
        title: 'Template Created',
        message: `Template "${formData.name}" has been created successfully.`,
      });
      onCreated();
      onClose();
      // Reset form
      setFormData({
        name: '',
        description: '',
        methodology: 'agile',
        scope: 'organization',
        phases: [],
        taskTemplates: [],
        availableKPIs: [],
        defaultEnabledKPIs: [],
      });
    } catch (error: any) {
      console.error('Failed to create template:', error);
      addToast({
        type: 'error',
        title: 'Creation Failed',
        message: error?.response?.data?.message || error?.message || 'Failed to create template',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Create New Template
                  </h3>

                  <div className="space-y-4">
                    {/* Name */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Template Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                        placeholder="e.g., My Custom Agile Template"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        id="description"
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                        placeholder="Describe what this template is for..."
                      />
                    </div>

                    {/* Methodology */}
                    <div>
                      <label htmlFor="methodology" className="block text-sm font-medium text-gray-700">
                        Methodology *
                      </label>
                      <select
                        id="methodology"
                        required
                        value={formData.methodology}
                        onChange={(e) => setFormData({ ...formData, methodology: e.target.value as any })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                      >
                        <option value="agile">Agile</option>
                        <option value="waterfall">Waterfall</option>
                        <option value="kanban">Kanban</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    {/* Scope */}
                    <div>
                      <label htmlFor="scope" className="block text-sm font-medium text-gray-700">
                        Scope
                      </label>
                      <select
                        id="scope"
                        value={formData.scope}
                        onChange={(e) => setFormData({ ...formData, scope: e.target.value as any })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                      >
                        <option value="organization">Organization</option>
                        <option value="team">Team</option>
                        <option value="personal">Personal</option>
                      </select>
                    </div>

                    {/* Set as Default */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isDefault"
                        checked={formData.isDefault || false}
                        onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-900">
                        Set as default template for this scope
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={loading || !formData.name.trim()}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Template'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}



