import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { templatesApi } from '@/services/templates.api';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { track } from '@/lib/telemetry';

interface Workspace {
  id: string;
  name: string;
  description?: string;
}

interface UseTemplateModalProps {
  open: boolean;
  onClose: () => void;
  templateId: string;
  templateName: string;
}

export function UseTemplateModal({
  open,
  onClose,
  templateId,
  templateName,
}: UseTemplateModalProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [projectName, setProjectName] = useState(templateName);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      loadWorkspaces();
      setProjectName(templateName);
    }
  }, [open, templateName]);

  const loadWorkspaces = async () => {
    setLoading(true);
    try {
      // TODO: Phase 4 - Filter workspaces by permission in frontend
      // For now, show all workspaces and rely on backend permission check
      const { data } = await api.get('/workspaces');
      setWorkspaces(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load workspaces:', error);
      toast.error('Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspaceId || !projectName.trim()) {
      toast.error('Please select a workspace and enter a project name');
      return;
    }

    setSubmitting(true);
    try {
      const result = await templatesApi.instantiate(templateId, {
        workspaceId: selectedWorkspaceId,
        projectName: projectName.trim(),
      });

      // Backend returns { data: { projectId, name, workspaceId } }
      const projectId = result.projectId || (result as { id?: string }).id;
      if (!projectId) {
        throw new Error('Project ID not returned from server');
      }

      track('template.instantiated', {
        templateId,
        workspaceId: selectedWorkspaceId,
        projectId,
      });

      toast.success('Project created successfully');
      onClose();
      navigate(`/projects/${projectId}`);
    } catch (error: any) {
      console.error('Failed to create project from template:', error);

      // Show user-friendly error messages based on error code
      const errorCode = error?.response?.data?.code;
      const errorMessage = error?.response?.data?.message || error?.message;

      let userMessage = 'Failed to create project from template';

      if (errorCode === 'MISSING_WORKSPACE_ID') {
        userMessage = 'Please select a workspace to create the project in.';
      } else if (errorCode === 'MISSING_PROJECT_NAME') {
        userMessage = 'Please enter a project name.';
      } else if (errorCode === 'MISSING_ORGANIZATION_ID') {
        userMessage = 'Organization context is missing. Please refresh and try again.';
      } else if (errorCode === 'TEMPLATE_INSTANTIATION_FAILED' || errorCode === 'TEMPLATE_APPLY_FAILED') {
        userMessage = errorMessage || 'Failed to create project. Please try again or contact support.';
      } else if (errorMessage) {
        userMessage = errorMessage;
      }

      toast.error(userMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl"
        data-testid="template-use-modal"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Use in Workspace
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="workspace-select"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Workspace
            </label>
            {loading ? (
              <div className="text-sm text-gray-500">Loading workspaces...</div>
            ) : (
              <select
                id="workspace-select"
                value={selectedWorkspaceId}
                onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                required
                data-testid="template-use-workspace-select"
              >
                <option value="">Select a workspace</option>
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label
              htmlFor="project-name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Project Name
            </label>
            <input
              type="text"
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              required
              data-testid="template-use-name-input"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedWorkspaceId || !projectName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="template-use-submit"
            >
              {submitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}













