import React, { useState, useEffect } from 'react';
import { Task } from '../../types/task.types';
import { taskService } from '../../services/taskService';
import ConflictResolver from '../resources/ConflictResolver';
import { TrashIcon, PencilIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { useGovernedAllocationMutation } from '@/features/resources/hooks/useGovernedAllocationMutation';
import { ResourceJustificationModal } from '@/features/resources/components/ResourceJustificationModal';

interface TaskCardProps {
  task: Task;
  viewMode?: 'board' | 'list';
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  viewMode = 'board',
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [progress, setProgress] = useState(task.progress);
  const [showConflictResolver, setShowConflictResolver] = useState(false);
  const [pendingReassignment, setPendingReassignment] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState('');

  // Use governed allocation mutation for automatic justification handling
  const {
    createAllocation,
    isJustificationModalOpen,
    justificationModalProps,
    handleJustificationSubmit,
    handleJustificationCancel,
  } = useGovernedAllocationMutation({
    onSuccess: () => {
      // Allocation created successfully
    },
    onError: (error) => {
      console.error('Failed to create allocation:', error);
    },
  });

  useEffect(() => {
    if (showAssignModal) {
      loadResources();
    }
  }, [showAssignModal]);

  const loadResources = async () => {
    try {
      // Use resourceService for consistency
      const { resourceService } = await import('../../services/resourceService');
      const data = await resourceService.getResources();
      setResources(data);
    } catch (error) {
      console.error('Failed to load resources:', error);
    }
  };

  const handleProgressChange = async (newProgress: number) => {
    try {
      const updated = await taskService.updateProgress(task.id, newProgress);
      onUpdate(updated);
      setProgress(newProgress);
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const handleStatusChange = async (newStatus: Task['status']) => {
    try {
      const updated = await taskService.updateTask(task.id, { status: newStatus });
      onUpdate(updated);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await taskService.deleteTask(task.id);
        onDelete(task.id);
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const handleAssignResource = () => {
    if (!selectedResource) return;

    const startDate = task.startDate || new Date().toISOString().split('T')[0];
    const endDate = task.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    setPendingReassignment({
      taskId: task.id,
      resourceId: selectedResource,
      hours: task.estimatedHours || 40,
      startDate,
      endDate
    });
    setShowAssignModal(false);
    setShowConflictResolver(true);
  };

  const handleConflictResolution = async (solution: any) => {
    try {
      if (solution.type === 'no-conflict' || solution.type === 'override') {
        // Proceed with assignment
        const updated = await taskService.updateTask(task.id, {
          assignedTo: pendingReassignment.resourceId
        });

        // Calculate allocation percentage from hours
        const weeks = Math.ceil(
          (new Date(pendingReassignment.endDate).getTime() -
           new Date(pendingReassignment.startDate).getTime()) /
          (7 * 24 * 60 * 60 * 1000)
        );
        const hoursPerWeek = pendingReassignment.hours / weeks;

        // Create allocation record using governed mutation (handles justification automatically)
        if (!task.projectId) {
          console.warn('Task missing projectId, cannot create allocation');
          return;
        }

        await createAllocation({
          taskId: pendingReassignment.taskId,
          resourceId: pendingReassignment.resourceId,
          projectId: task.projectId,
          startDate: pendingReassignment.startDate,
          endDate: pendingReassignment.endDate,
          allocationPercentage: Math.min(100, (hoursPerWeek / 40) * 100), // Assume 40h/week capacity
          hoursPerWeek,
        });

        onUpdate(updated);
      } else if (solution.type === 'alternative') {
        // Handle alternative solution
        console.log('Implement alternative:', solution.alternative);
        // You can add more specific handling based on alternative type
      }
    } catch (error) {
      console.error('Failed to assign resource:', error);
      // Error is handled by the governed mutation hook
    } finally {
      setShowConflictResolver(false);
      setPendingReassignment(null);
      setSelectedResource('');
    }
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  const statusColors = {
    todo: 'bg-gray-100',
    in_progress: 'bg-blue-100',
    review: 'bg-yellow-100',
    done: 'bg-green-100',
  };

  if (viewMode === 'list') {
    return (
      <>
        <tr>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm font-medium text-gray-900">{task.name}</div>
            {task.description && (
              <div className="text-sm text-gray-500">{task.description}</div>
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value as Task['status'])}
              className={`text-xs rounded-full px-2 py-1 ${statusColors[task.status]}`}
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center">
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                onMouseUp={() => handleProgressChange(progress)}
                className="w-20 mr-2"
              />
              <span className="text-sm text-gray-600">{progress}%</span>
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <div className="flex items-center">
              {task.assignee ? (
                <>
                  {task.assignee.firstName} {task.assignee.lastName}
                </>
              ) : (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <UserPlusIcon className="h-4 w-4 mr-1" />
                  Assign
                </button>
              )}
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button
              onClick={() => setIsEditing(true)}
              className="text-indigo-600 hover:text-indigo-900 mr-2"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={handleDelete}
              className="text-red-600 hover:text-red-900"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </td>
        </tr>

        {/* Resource Assignment Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Assign Resource</h3>
              <select
                value={selectedResource}
                onChange={(e) => setSelectedResource(e.target.value)}
                className="w-full border rounded px-3 py-2 mb-4"
              >
                <option value="">Select a resource</option>
                {resources.map(resource => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name} - {resource.role}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignResource}
                  disabled={!selectedResource}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                >
                  Check & Assign
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Conflict Resolver */}
        {showConflictResolver && pendingReassignment && (
          <ConflictResolver
            resourceId={pendingReassignment.resourceId}
            taskId={pendingReassignment.taskId}
            estimatedHours={pendingReassignment.hours}
            startDate={pendingReassignment.startDate}
            endDate={pendingReassignment.endDate}
            onResolve={handleConflictResolution}
            onCancel={() => {
              setShowConflictResolver(false);
              setPendingReassignment(null);
            }}
          />
        )}
      </>
    );
  }

  // Board view remains the same but add assign button if no assignee
  return (
    <>
      <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-medium text-gray-900">{task.name}</h4>
          <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[task.priority]}`}>
            {task.priority}
          </span>
        </div>

        {task.description && (
          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
        )}

        <div className="space-y-2">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Assignee */}
          {task.assignee ? (
            <div className="flex items-center text-sm text-gray-600">
              <div className="w-6 h-6 bg-gray-300 rounded-full mr-2 flex items-center justify-center text-xs">
                {task.assignee.firstName?.[0]}{task.assignee.lastName?.[0]}
              </div>
              <span>{task.assignee.firstName} {task.assignee.lastName}</span>
            </div>
          ) : (
            <button
              onClick={() => setShowAssignModal(true)}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
            >
              <UserPlusIcon className="h-4 w-4 mr-1" />
              Assign Resource
            </button>
          )}

          {/* Due Date */}
          {task.dueDate && (
            <div className="text-xs text-gray-500">
              Due: {new Date(task.dueDate).toLocaleDateString()}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-2 border-t">
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value as Task['status'])}
              className="text-xs border rounded px-2 py-1"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>

            <div className="flex gap-1">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <PencilIcon className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={handleDelete}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <TrashIcon className="h-4 w-4 text-red-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals at root level */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Assign Resource</h3>
            <select
              value={selectedResource}
              onChange={(e) => setSelectedResource(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4"
            >
              <option value="">Select a resource</option>
              {resources.map(resource => (
                <option key={resource.id} value={resource.id}>
                  {resource.name} - {resource.role}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignResource}
                disabled={!selectedResource}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
              >
                Check & Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {showConflictResolver && pendingReassignment && (
        <ConflictResolver
          resourceId={pendingReassignment.resourceId}
          taskId={pendingReassignment.taskId}
          estimatedHours={pendingReassignment.hours}
          startDate={pendingReassignment.startDate}
          endDate={pendingReassignment.endDate}
          onResolve={handleConflictResolution}
          onCancel={() => {
            setShowConflictResolver(false);
            setPendingReassignment(null);
          }}
        />
      )}

      {/* Justification Modal */}
      <ResourceJustificationModal
        {...justificationModalProps}
        onSubmit={handleJustificationSubmit}
        onCancel={handleJustificationCancel}
      />
    </>
  );
};

export default TaskCard;
