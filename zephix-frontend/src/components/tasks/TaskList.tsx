import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { CreateTaskForm } from './CreateTaskForm';
import { AssignResourceModal } from '../resources/AssignResourceModal';
import { EditTaskModal } from './EditTaskModal';
import { useWorkspaceStore } from '@/state/workspace.store';

interface Task {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  projectId: string;
}

interface TaskListProps {
  projectId: string;
}

export function TaskList({ projectId }: TaskListProps) {
  const { isReadOnly } = useWorkspaceStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/projects/${projectId}/tasks`);

      // Handle both interceptor-wrapped and direct responses
      const responseData = response.data?.data || response.data;

      // Ensure we always have an array
      const tasksArray = Array.isArray(responseData) ? responseData :
                        Array.isArray(responseData?.tasks) ? responseData.tasks :
                        Array.isArray(responseData?.data) ? responseData.data : [];

      setTasks(tasksArray);
    } catch (error: any) {
      console.error('Failed to load tasks:', error);
      // Don't show error to user, just show empty state
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignResource = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShowAssignModal(true);
  };

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setShowEditModal(true);
  };

  const handleUpdateSuccess = (updatedTask: any) => {
    // Refresh the tasks list
    loadTasks();
    setShowEditModal(false);
    setEditingTask(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading tasks...</span>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
        <p className="text-gray-500 mb-4">Get started by creating your first task for this project.</p>
        {!isReadOnly && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add first task
          </button>
        )}

        {showCreateForm && (
          <CreateTaskForm
            projectId={projectId}
            onSuccess={(task) => {
              setTasks([...tasks, task]);
              setShowCreateForm(false);
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Tasks ({tasks.length})</h3>
        {!isReadOnly && (
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Task
          </button>
        )}
      </div>

      <div className="space-y-3">
        {tasks.map(task => (
          <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">{task.name}</h4>
                {task.description && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{task.description}</p>
                )}
                <div className="mt-2 flex items-center space-x-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    task.status === 'completed' ? 'bg-green-100 text-green-800' :
                    task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                    task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {task.status}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    task.priority === 'high' ? 'bg-red-100 text-red-800' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    task.priority === 'low' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {task.priority}
                  </span>
                  {task.dueDate && (
                    <span className="text-xs text-gray-500">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  {task.resourceImpactScore && (
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                      task.resourceImpactScore > 100 ? 'bg-red-100 text-red-800' :
                      task.resourceImpactScore > 80 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {task.resourceImpactScore}% allocated
                    </span>
                  )}
                </div>
              </div>
              {!isReadOnly && (
                <div className="ml-4 flex-shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => handleEditTask(task)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleAssignResource(task.id)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Assign Resource
                  </button>
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Resource Assignment Modal */}
      {showAssignModal && (
        <AssignResourceModal
          projectId={projectId}
          taskId={selectedTaskId || undefined}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedTaskId(null);
          }}
          onSuccess={(assignment) => {
            console.log('Resource assigned:', assignment);
            setShowAssignModal(false);
            setSelectedTaskId(null);
            // Optionally reload tasks to show assignment
            loadTasks();
          }}
        />
      )}

      {/* Edit Task Modal */}
      {showEditModal && editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleUpdateSuccess}
          projectTasks={tasks}
        />
      )}
    </div>
  );
}
