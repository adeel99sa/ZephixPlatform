/**
 * Create Template Modal
 * Form for creating new ORG or WORKSPACE templates
 */

import { useState } from 'react';
import { createTemplate, CreateTemplateDto, TemplateScope, TemplateDto } from '@/features/templates/templates.api';
import { getActiveWorkspaceId } from '@/utils/workspace';

interface CreateTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (template: TemplateDto) => void;
}

export function CreateTemplateModal({ open, onClose, onSuccess }: CreateTemplateModalProps) {
  const [formData, setFormData] = useState<CreateTemplateDto>({
    name: '',
    description: '',
    templateScope: 'ORG',
    kind: 'project',
    methodology: undefined,
    defaultEnabledKPIs: [],
    structure: {
      phases: [
        {
          name: 'Phase 1',
          sortOrder: 1,
          tasks: [
            {
              title: 'Task 1',
              status: 'TODO',
              sortOrder: 1,
            },
          ],
        },
      ],
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workspaceId = getActiveWorkspaceId();
  const requiresWorkspace = formData.templateScope === 'WORKSPACE' && !workspaceId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Template name is required');
      return;
    }

    if (requiresWorkspace) {
      setError('Please select a workspace first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const template = await createTemplate(formData);
      onSuccess(template);
      // Reset form
      setFormData({
        name: '',
        description: '',
        templateScope: 'ORG',
        kind: 'project',
        methodology: undefined,
        defaultEnabledKPIs: [],
        structure: {
          phases: [
            {
              name: 'Phase 1',
              sortOrder: 1,
              tasks: [
                {
                  title: 'Task 1',
                  status: 'TODO',
                  sortOrder: 1,
                },
              ],
            },
          ],
        },
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Create New Template</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {requiresWorkspace && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Please select a workspace first to create WORKSPACE templates.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            {/* Scope */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scope
              </label>
              <select
                value={formData.templateScope}
                onChange={(e) => setFormData({ ...formData, templateScope: e.target.value as TemplateScope })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="ORG">Organization</option>
                <option value="WORKSPACE">Workspace</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {formData.templateScope === 'ORG'
                  ? 'Available to all workspaces in your organization'
                  : 'Available only in the selected workspace'}
              </p>
            </div>

            {/* Methodology */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Methodology (Optional)
              </label>
              <select
                value={formData.methodology || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    methodology: e.target.value as any || undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">None</option>
                <option value="waterfall">Waterfall</option>
                <option value="scrum">Scrum</option>
                <option value="agile">Agile</option>
                <option value="kanban">Kanban</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            {/* Default KPIs - Placeholder for now */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default KPIs
              </label>
              <p className="text-xs text-gray-500 mb-2">
                KPI selection will be added in a later step
              </p>
              <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-500">
                No KPIs selected
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || requiresWorkspace}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Template'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
