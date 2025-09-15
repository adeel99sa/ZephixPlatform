import React, { useState, useEffect } from 'react';
import { Task, ProjectPhase } from '../../types/task.types';
import { taskService } from '../../services/taskService';
import TaskCard from './TaskCard';
import CreateTaskModal from './CreateTaskModal';
import { PlusIcon } from '@heroicons/react/24/outline';

interface TaskListProps {
  projectId: string;
}

const TaskList: React.FC<TaskListProps> = ({ projectId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board');

  useEffect(() => {
    loadTasks();
    loadPhases();
  }, [projectId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await taskService.getTasks(projectId);
      setTasks(data);
    } catch (err) {
      setError('Failed to load tasks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPhases = async () => {
    try {
      const data = await taskService.getProjectPhases(projectId);
      setPhases(data);
    } catch (err) {
      console.error('Failed to load phases:', err);
    }
  };

  const handleTaskCreated = (newTask: Task) => {
    setTasks([...tasks, newTask]);
    setShowCreateModal(false);
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const getTasksByStatus = (status: Task['status']) => {
    return tasks.filter(task => 
      task.status === status && 
      (!selectedPhase || task.phaseId === selectedPhase)
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  if (error) return (
    <div className="text-red-600 text-center p-4">{error}</div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tasks</h2>
        <div className="flex gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-1 rounded ${viewMode === 'board' ? 'bg-white shadow' : ''}`}
            >
              Board
            </button>
          </div>
          
          {/* Phase Filter */}
          <select
            value={selectedPhase || ''}
            onChange={(e) => setSelectedPhase(e.target.value || null)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">All Phases</option>
            {phases.map(phase => (
              <option key={phase.id} value={phase.id}>
                {phase.name}
              </option>
            ))}
          </select>

          {/* Add Task Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5" />
            Add Task
          </button>
        </div>
      </div>

      {/* Task Board View */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-4 gap-4">
          {(['todo', 'in_progress', 'review', 'done'] as const).map(status => (
            <div key={status} className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3 capitalize">
                {status.replace('_', ' ')} ({getTasksByStatus(status).length})
              </h3>
              <div className="space-y-2">
                {getTasksByStatus(status).map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onUpdate={handleTaskUpdated}
                    onDelete={handleTaskDeleted}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assignee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  viewMode="list"
                  onUpdate={handleTaskUpdated}
                  onDelete={handleTaskDeleted}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          projectId={projectId}
          phases={phases}
          onClose={() => setShowCreateModal(false)}
          onTaskCreated={handleTaskCreated}
        />
      )}
    </div>
  );
};

export default TaskList;
