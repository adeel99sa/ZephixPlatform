import React, { useState } from 'react';
import { PlusIcon, PencilIcon } from '@heroicons/react/24/outline';
import { useTasks, useCreateTask, useUpdateTask, Task } from '../api/useTasks';

interface TasksKanbanProps {
  projectId: string;
}

const columns = [
  { id: 'backlog', title: 'Backlog', color: 'bg-gray-100' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-blue-100' },
  { id: 'blocked', title: 'Blocked', color: 'bg-red-100' },
  { id: 'done', title: 'Done', color: 'bg-green-100' },
];

export const TasksKanban: React.FC<TasksKanbanProps> = ({ projectId }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const { data: tasksData, isLoading } = useTasks({ projectId, view: 'kanban' });
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const tasks = tasksData?.items || [];

  const tasksByStatus = tasks.reduce((acc, task) => {
    if (!acc[task.status]) {
      acc[task.status] = [];
    }
    acc[task.status].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      await createTask.mutateAsync({
        title: newTaskTitle.trim(),
        projectId,
        status: 'backlog',
        priority: 'medium',
      });
      setNewTaskTitle('');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await updateTask.mutateAsync({
        id: taskId,
        status: newStatus as Task['status'],
      });
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleUpdateTaskTitle = async (taskId: string) => {
    if (!editingTitle.trim()) return;

    try {
      await updateTask.mutateAsync({
        id: taskId,
        title: editingTitle.trim(),
      });
      setEditingTask(null);
      setEditingTitle('');
    } catch (error) {
      console.error('Failed to update task title:', error);
    }
  };

  const startEditing = (task: Task) => {
    setEditingTask(task.id);
    setEditingTitle(task.title);
  };

  const cancelEditing = () => {
    setEditingTask(null);
    setEditingTitle('');
  };

  if (isLoading) {
    return (
      <div className="flex space-x-6">
        {columns.map((column) => (
          <div key={column.id} className="flex-1">
            <div className="bg-gray-100 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-4">{column.title}</h3>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded p-3 h-20 animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex space-x-6 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div key={column.id} className="flex-1 min-w-0">
          <div className={`${column.color} rounded-lg p-4`}>
            <h3 className="font-medium text-gray-900 mb-4">{column.title}</h3>
            
            <div className="space-y-2">
              {tasksByStatus[column.id]?.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  {editingTask === task.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleUpdateTaskTitle(task.id);
                      }}
                      className="space-y-2"
                    >
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <div className="flex space-x-2">
                        <button
                          type="submit"
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
                        <button
                          onClick={() => startEditing(task)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <PencilIcon className="h-3 w-3" />
                        </button>
                      </div>
                      
                      {task.description && (
                        <p className="text-xs text-gray-500">{task.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.priority}
                        </span>
                        
                        {task.assignee && (
                          <span className="text-xs text-gray-500">
                            {task.assignee.name}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex space-x-1">
                        {columns
                          .filter(col => col.id !== task.status)
                          .map((col) => (
                            <button
                              key={col.id}
                              onClick={() => handleUpdateTaskStatus(task.id, col.id)}
                              className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300"
                            >
                              Move to {col.title}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {column.id === 'backlog' && (
              <div className="mt-4">
                {isCreating ? (
                  <form onSubmit={handleCreateTask} className="space-y-2">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Task title..."
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        disabled={createTask.isPending}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {createTask.isPending ? 'Creating...' : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreating(false);
                          setNewTaskTitle('');
                        }}
                        className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsCreating(true)}
                    className="w-full flex items-center justify-center text-sm text-gray-500 hover:text-gray-700 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add task
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
