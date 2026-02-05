import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface EditTaskModalProps {
  task: any;
  onClose: () => void;
  onSuccess: (updatedTask: any) => void;
  projectTasks?: any[];
}

export function EditTaskModal({ task, onClose, onSuccess, projectTasks = [] }: EditTaskModalProps) {
  const [formData, setFormData] = useState({
    name: task.name || task.title || '',
    description: task.description || '',
    status: task.status || 'todo',
    priority: task.priority || 'medium',
    estimatedHours: task.estimatedHours || 8,
    startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
    endDate: task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '',
    assignedResources: task.assignedResources || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [loadingDependencies, setLoadingDependencies] = useState(false);

  useEffect(() => {
    loadDependencies();
  }, [task.id]);

  const loadDependencies = async () => {
    try {
      setLoadingDependencies(true);
      // Note: Dependencies are included in task response, or use GET /work/tasks/:id
      // For now, dependencies are managed via task update
      const response = await api.get(`/work/tasks/${task.id}`);
      const taskData = response.data?.data || response.data;
      // If backend includes dependencies in task response, extract them here
      setDependencies([]);
    } catch (error) {
      console.error('Failed to load dependencies:', error);
      setDependencies([]);
    } finally {
      setLoadingDependencies(false);
    }
  };

  const addDependency = async (taskId: string, predecessorId: string) => {
    try {
      await api.post(`/work/tasks/${taskId}/dependencies`, { predecessorId });
      await loadDependencies();
    } catch (error: any) {
      console.error('Failed to add dependency:', error);
      setError(error.response?.data?.message || 'Failed to add dependency');
    }
  };

  const removeDependency = async (taskId: string, dependencyId: string) => {
    try {
      // Backend DELETE /work/tasks/:id/dependencies expects body with predecessorId
      await api.delete(`/work/tasks/${taskId}/dependencies`, {
        data: { predecessorId: dependencyId }
      });
      await loadDependencies();
    } catch (error: any) {
      console.error('Failed to remove dependency:', error);
      setError(error.response?.data?.message || 'Failed to remove dependency');
    }
  };

  const getTaskName = (taskId: string) => {
    const task = projectTasks.find(t => t.id === taskId);
    return task?.name || task?.title || taskId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await api.patch(`/work/tasks/${task.id}`, formData);
      onSuccess(response.data?.data || response.data);
      onClose();
    } catch (err: any) {
      console.error('Task update error:', err);

      // Handle different error response formats
      let errorMessage = 'Failed to update task';

      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.message) {
          errorMessage = typeof errorData.message === 'string'
            ? errorData.message
            : JSON.stringify(errorData.message);
        } else if (errorData.error) {
          errorMessage = typeof errorData.error === 'string'
            ? errorData.error
            : JSON.stringify(errorData.error);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Edit Task</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Task Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                min={formData.startDate}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Estimated Hours</label>
            <input
              type="number"
              value={formData.estimatedHours}
              onChange={(e) => setFormData({...formData, estimatedHours: parseInt(e.target.value) || 0})}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Assigned Resources</label>
            <input
              type="text"
              value={formData.assignedResources}
              onChange={(e) => setFormData({...formData, assignedResources: e.target.value})}
              placeholder="e.g., John Smith, Sarah Lee"
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Dependencies Section */}
          <div>
            <label className="block text-sm font-medium mb-1">Dependencies</label>
            <div className="border rounded p-3 bg-gray-50">
              {projectTasks && projectTasks.length > 0 ? (
                <>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        addDependency(task.id, e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="w-full px-3 py-2 border rounded mb-2"
                    disabled={loadingDependencies}
                  >
                    <option value="">Add dependency...</option>
                    {projectTasks
                      .filter(t => t.id !== task.id && !dependencies.some(dep => dep.predecessorId === t.id))
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name || t.title}
                        </option>
                      ))
                    }
                  </select>

                  {loadingDependencies ? (
                    <div className="text-sm text-gray-500">Loading dependencies...</div>
                  ) : dependencies.length > 0 ? (
                    <div className="space-y-1">
                      {dependencies.map(dep => (
                        <div key={dep.id} className="flex justify-between items-center py-1 px-2 bg-white rounded border">
                          <span className="text-sm">{dep.predecessorName || getTaskName(dep.predecessorId)}</span>
                          <button
                            type="button"
                            onClick={() => removeDependency(task.id, dep.predecessorId)}
                            className="text-red-500 text-sm hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No dependencies</div>
                  )}
                </>
              ) : (
                <div className="text-sm text-gray-500">No other tasks available for dependencies</div>
              )}
            </div>
          </div>

          {error && (
            <div className="text-red-600 bg-red-50 p-2 rounded">{error}</div>
          )}

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

