/**
 * Phase 7: Project Board Page
 * Simple board view with columns: To Do, In Progress, Done
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { projectsApi, Task } from '../../projects/projects.api';
import { LayoutGrid } from 'lucide-react';

export default function ProjectBoardPage() {
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

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => {
      const taskStatus = task.status?.toLowerCase() || '';
      if (status === 'todo') {
        return taskStatus === 'not_started' || taskStatus === 'todo' || taskStatus === '';
      }
      if (status === 'in-progress') {
        return taskStatus === 'in_progress' || taskStatus === 'in-progress' || taskStatus === 'active';
      }
      if (status === 'done') {
        return taskStatus === 'completed' || taskStatus === 'done';
      }
      return false;
    });
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="project-board-root">
        <div className="text-center py-12 text-gray-500">Loading board...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" data-testid="project-board-root">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-semibold">Error loading board</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const todoTasks = getTasksByStatus('todo');
  const inProgressTasks = getTasksByStatus('in-progress');
  const doneTasks = getTasksByStatus('done');

  return (
    <div className="p-6" data-testid="project-board-root">
      <div className="mb-6 flex items-center gap-2">
        <LayoutGrid className="h-5 w-5 text-gray-700" />
        <h1 className="text-2xl font-bold text-gray-900">Project Board</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* To Do Column */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">To Do</h2>
            <span className="bg-gray-200 text-gray-700 text-xs font-medium px-2 py-1 rounded-full">
              {todoTasks.length}
            </span>
          </div>
          <div className="space-y-2">
            {todoTasks.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No tasks</p>
            ) : (
              todoTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-md border border-gray-200 p-3 hover:shadow-sm transition-shadow"
                >
                  <p className="text-sm font-medium text-gray-900">{task.title}</p>
                  {task.assignee && (
                    <p className="text-xs text-gray-500 mt-1">
                      {task.assignee.firstName} {task.assignee.lastName}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">In Progress</h2>
            <span className="bg-blue-200 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
              {inProgressTasks.length}
            </span>
          </div>
          <div className="space-y-2">
            {inProgressTasks.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No tasks</p>
            ) : (
              inProgressTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-md border border-gray-200 p-3 hover:shadow-sm transition-shadow"
                >
                  <p className="text-sm font-medium text-gray-900">{task.title}</p>
                  {task.assignee && (
                    <p className="text-xs text-gray-500 mt-1">
                      {task.assignee.firstName} {task.assignee.lastName}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Done Column */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Done</h2>
            <span className="bg-green-200 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
              {doneTasks.length}
            </span>
          </div>
          <div className="space-y-2">
            {doneTasks.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No tasks</p>
            ) : (
              doneTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-md border border-gray-200 p-3 hover:shadow-sm transition-shadow"
                >
                  <p className="text-sm font-medium text-gray-900">{task.title}</p>
                  {task.assignee && (
                    <p className="text-xs text-gray-500 mt-1">
                      {task.assignee.firstName} {task.assignee.lastName}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        <p>Note: Drag and drop functionality will be available in a future update.</p>
      </div>
    </div>
  );
}

