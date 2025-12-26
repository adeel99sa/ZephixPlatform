/**
 * Phase 7: Project Tasks Page
 * List view of all project tasks
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { projectsApi, Task } from '../../projects/projects.api';
import { List, AlertCircle } from 'lucide-react';

export default function ProjectTasksPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadTasks();
    }
  }, [id]);

  const loadTasks = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const tasksData = await projectsApi.getProjectTasks(id);
      setTasks(tasksData);
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
      setError(err?.response?.data?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="project-tasks-root">
        <div className="text-center py-12 text-gray-500">Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" data-testid="project-tasks-root">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-semibold">Error loading tasks</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="project-tasks-root">
      <div className="mb-6 flex items-center gap-2">
        <List className="h-5 w-5 text-gray-700" />
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No tasks found for this project.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200" data-testid="project-tasks-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assignee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">{task.title}</span>
                      {task.description && (
                        <span className="ml-2 text-xs text-gray-500">({task.description.substring(0, 50)})</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{task.taskNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {task.status || 'not_started'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {task.assignee ? (
                      `${task.assignee.firstName || ''} ${task.assignee.lastName || ''}`.trim() || task.assignee.email
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(task.dueDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      task.priority === 'high' || task.priority === 'critical'
                        ? 'bg-red-100 text-red-800'
                        : task.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {task.priority || 'medium'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        <p>Note: Task editing will be available in a future update.</p>
      </div>
    </div>
  );
}

