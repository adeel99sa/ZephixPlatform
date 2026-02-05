import { useState } from 'react';
import { api } from '@/lib/api';

interface CreateTaskFormProps {
  projectId: string;
  onSuccess: (task: any) => void;
  onCancel: () => void;
}

export function CreateTaskForm({ projectId, onSuccess, onCancel }: CreateTaskFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    estimatedHours: 8,
    status: 'todo',
    priority: 'medium',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    assignedResources: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Task name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      console.log('Creating task with data:', { ...formData, projectId });

      const response = await api.post('/work/tasks', {
        ...formData,
        projectId,
        estimatedHours: parseInt(formData.estimatedHours.toString()) || 0
      });

      console.log('Task created successfully:', response.data);
      onSuccess(response.data);

    } catch (err: any) {
      console.error('Task creation error:', err);
      const errorMessage = typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : typeof err.response?.data?.error === 'string'
        ? err.response.data.error
        : 'Failed to create task';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-4">Create New Task</h3>

      {/* Task Name */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Task Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          placeholder="Enter task name"
          disabled={saving}
        />
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Enter task description (optional)"
          disabled={saving}
        />
      </div>

      {/* Estimated Hours and Priority */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Estimated Hours</label>
          <input
            type="number"
            value={formData.estimatedHours}
            onChange={(e) => setFormData({...formData, estimatedHours: parseInt(e.target.value) || 0})}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            min="0"
            step="1"
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({...formData, priority: e.target.value})}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            disabled={saving}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          {/* Date Range Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                End Date *
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                min={formData.startDate}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Assigned Resources Field */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Assigned Resources
              <span className="text-gray-500 text-xs ml-1">(comma separated names)</span>
            </label>
            <input
              type="text"
              value={formData.assignedResources}
              onChange={(e) => setFormData({...formData, assignedResources: e.target.value})}
              placeholder="e.g., John Smith, Sarah Lee, External QA Team"
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !formData.name.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Creating...' : 'Create Task'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
