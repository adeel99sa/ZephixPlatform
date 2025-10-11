import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { projectService } from '../services/projectService';

export function CreateProject() {
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get('workspaceId');
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    methodology: 'agile',
    status: 'planning',
    priority: 'medium',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // CRITICAL: Prevent form submission from bubbling

    if (!workspaceId) {
      setError('Workspace ID is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await projectService.createInWorkspace(workspaceId, formData);
      
      // CRITICAL: Navigate to workspace, not logout
      navigate(`/workspace/${workspaceId}`, { 
        state: { projectCreated: true } 
      });
    } catch (err: any) {
      console.error('Project creation failed:', err);
      setError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Create New Project</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Project Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full border rounded px-3 py-2"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Methodology</label>
          <select
            value={formData.methodology}
            onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
            className="w-full border rounded px-3 py-2"
          >
            <option value="agile">Agile</option>
            <option value="scrum">Scrum</option>
            <option value="waterfall">Waterfall</option>
            <option value="kanban">Kanban</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full border rounded px-3 py-2"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate(`/workspace/${workspaceId}`);
            }}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}
