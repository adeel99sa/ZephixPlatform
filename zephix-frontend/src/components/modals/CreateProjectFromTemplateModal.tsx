import { useState } from 'react';
import { X } from 'lucide-react';
import { Template } from '@/types/template.types';
import { api } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { isApiSuccess } from '@/types/api.types';

interface CreateProjectFromTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: Template | null;
  workspaceId: string;
  organizationId: string;
}

export function CreateProjectFromTemplateModal({
  isOpen,
  onClose,
  template,
  workspaceId,
  organizationId
}: CreateProjectFromTemplateModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });

  if (!isOpen || !template) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }

    if (formData.endDate && formData.endDate < formData.startDate) {
      setError('End date must be after start date');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/projects/from-template', {
        name: formData.name.trim(),
        description: formData.description.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        templateId: template.id,
        workspaceId,
        organizationId
      });

      // Check HTTP status first
      if (response.status < 200 || response.status >= 300) {
        throw new Error('Request failed with status ' + response.status);
      }

      const apiResponse = response.data;

      // Validate response structure
      if (!isApiSuccess(apiResponse)) {
        throw new Error(apiResponse.message || 'Request failed');
      }

      // Extract project ID from standardized response
      const projectId = apiResponse.data.id;
      
      if (!projectId) {
        throw new Error('Project created but no ID returned');
      }

      console.log('✅ Project created successfully:', projectId);

      // Close modal and navigate
      onClose();
      setTimeout(() => {
        navigate(`/projects/${projectId}`);
      }, 100);

    } catch (err: any) {
      console.error('Create project from template error:', err);
      
      // Handle different error types
      let errorMessage = 'Failed to create project from template';
      
      if (err.response?.data) {
        const apiError = err.response.data;
        errorMessage = apiError.message || errorMessage;
        
        // Log validation errors if present
        if (apiError.errors) {
          console.error('Validation errors:', apiError.errors);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-semibold">Create Project from Template</h2>
            <p className="text-sm text-gray-600 mt-1">{template.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            type="button"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Info */}
        <div className="px-6 py-4 bg-blue-50 border-b">
          <p className="text-sm text-gray-700">{template.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {template.includes.map((item, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-white text-xs rounded-md border border-blue-200 text-gray-700"
              >
                ✓ {item}
              </span>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-600">
            <span>Setup time: {template.estimatedSetup}</span>
            <span className="mx-2">•</span>
            <span>Recommended team: {template.teamSize}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Project Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Mobile App MVP"
              required
              maxLength={100}
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Brief description of the project..."
              maxLength={500}
              disabled={loading}
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date (optional)
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={formData.startDate}
                disabled={loading}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating Project...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
