import React, { useState, useEffect } from 'react';
import { Plus, ChevronRight, ChevronDown, Clock, User, Flag, AlertCircle, CheckCircle, Building } from 'lucide-react';
import api from '../../services/api';

interface TaskDependency {
  id: string;
  dependencyType: 'quick_text' | 'internal_task' | 'external' | 'vendor' | 'approval' | 'milestone';
  description: string;
  status: 'pending' | 'ready' | 'completed' | 'blocked';
  targetDate?: string;
  dependsOnTask?: {
    id: string;
    title: string;
  };
}

interface Task {
  id: string;
  taskNumber: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignee?: { id: string; firstName: string; lastName: string; email: string };
  estimatedHours: number;
  actualHours: number;
  progressPercentage: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  phaseId?: string;
  subtasks?: Task[];
  isBlocked: boolean;
  blockedReason?: string;
  assignmentType?: 'internal' | 'vendor';
  vendorName?: string;
  dependencies?: TaskDependency[];
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface Phase {
  id: string;
  phaseName: string;
  status: string;
  progressPercentage: number;
  totalTasks: number;
  completedTasks: number;
  tasks?: Task[];
}

interface TaskManagementProps {
  projectId: string;
  phases: Phase[];
}

export const TaskManagement: React.FC<TaskManagementProps> = ({ projectId, phases }) => {
  const { isReadOnly } = useWorkspaceStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expandedPhases, setExpandedPhases] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchAvailableUsers();
  }, [projectId]);

  const fetchAvailableUsers = async () => {
    try {
      const users = await api.get('/users/available');
      setAvailableUsers(users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/projects/${projectId}/tasks`);
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev =>
      prev.includes(phaseId)
        ? prev.filter(id => id !== phaseId)
        : [...prev, phaseId]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'blocked': return 'text-red-600 bg-red-50';
      case 'not_started': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <Flag className="h-4 w-4 text-red-500" />;
      case 'high': return <Flag className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Flag className="h-4 w-4 text-yellow-500" />;
      case 'low': return <Flag className="h-4 w-4 text-gray-400" />;
      default: return null;
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      await api.get(`/projects/${projectId}/tasks/${taskId}`, {
        method: 'PUT',
        body: { status }
      });
      fetchTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const updateTaskProgress = async (taskId: string, progress: number) => {
    try {
      await api.get(`/projects/${projectId}/tasks/${taskId}/progress`, {
        method: 'PUT',
        body: { progress }
      });
      fetchTasks();
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      await api.get(`/projects/${projectId}/tasks/${updatedTask.id}`, {
        method: 'PATCH',
        body: updatedTask
      });
      fetchTasks(); // Refresh list
      setEditModalOpen(false);
      setEditingTask(null);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Phase-based Task View */}
      {phases.map(phase => (
        <div key={phase.id} className="border rounded-lg">
          {/* Phase Header */}
          <div
            className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
            onClick={() => togglePhase(phase.id)}
          >
            <div className="flex items-center space-x-3">
              {expandedPhases.includes(phase.id) ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
              <h3 className="font-semibold">{phase.phaseName}</h3>
              <span className="text-sm text-gray-500">
                {phase.completedTasks}/{phase.totalTasks} tasks
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {/* Progress Bar */}
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${phase.progressPercentage}%` }}
                />
              </div>
              <span className="text-sm font-medium">{phase.progressPercentage}%</span>

              {!isReadOnly && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPhaseId(phase.id);
                    setShowCreateTask(true);
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 inline mr-1" />
                  Add Task
                </button>
              )}
            </div>
          </div>

          {/* Phase Tasks */}
          {expandedPhases.includes(phase.id) && (
            <div className="p-4 space-y-2">
              {tasks
                .filter(task => task.phaseId === phase.id)
                .map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onStatusChange={updateTaskStatus}
                    onProgressChange={updateTaskProgress}
                    onSelect={setSelectedTask}
                    onEdit={(task) => {
                      setEditingTask(task);
                      setEditModalOpen(true);
                    }}
                  />
                ))}

              {tasks.filter(task => task.phaseId === phase.id).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No tasks in this phase yet
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Create Task Modal */}
      {showCreateTask && (
        <CreateTaskModal
          projectId={projectId}
          phaseId={selectedPhaseId}
          phases={phases}
          existingTasks={tasks}
          availableUsers={availableUsers}
          onClose={() => {
            setShowCreateTask(false);
            setSelectedPhaseId(null);
          }}
          onSuccess={() => {
            fetchTasks();
            setShowCreateTask(false);
            setSelectedPhaseId(null);
          }}
        />
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingTask(null);
          }}
          onSave={handleUpdateTask}
          phases={phases}
          availableUsers={availableUsers}
        />
      )}

      {/* Task Detail Panel */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={fetchTasks}
        />
      )}
    </div>
  );
};

// Task Row Component
const TaskRow: React.FC<{
  task: Task;
  onStatusChange: (taskId: string, status: string) => void;
  onProgressChange: (taskId: string, progress: number) => void;
  onSelect: (task: Task) => void;
  onEdit: (task: Task) => void;
}> = ({ task, onStatusChange, onProgressChange, onSelect, onEdit }) => {
  return (
    <div className={`flex items-center justify-between p-3 border rounded hover:bg-gray-50
      ${task.assignmentType === 'vendor' ? 'border-purple-200 bg-purple-50' : ''}`}>
      <div className="flex items-center space-x-3">
        {/* Status Checkbox */}
        <input
          type="checkbox"
          checked={task.status === 'completed'}
          onChange={(e) => onStatusChange(task.id, e.target.checked ? 'completed' : 'in_progress')}
          className="h-4 w-4"
        />

        {/* Task Info */}
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">{task.taskNumber}</span>
            <span
              className="font-medium cursor-pointer hover:text-blue-600"
              onClick={() => onSelect(task)}
            >
              {task.title}
            </span>
            {task.isBlocked && <AlertCircle className="h-4 w-4 text-red-500" />}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Priority */}
        {getPriorityIcon(task.priority)}

        {/* Assignee */}
        {task.assignmentType === 'vendor' ? (
          <div className="flex items-center space-x-1">
            <Building className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium text-purple-700">
              {task.vendorName}
            </span>
          </div>
        ) : task.assignee ? (
          <div className="flex items-center space-x-1">
            <User className="h-4 w-4 text-gray-400" />
            <span className="text-sm">
              {task.assignee.firstName} {task.assignee.lastName}
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">Unassigned</span>
        )}

        {/* Progress */}
        <div className="flex items-center space-x-2">
          <input
            type="range"
            min="0"
            max="100"
            value={task.progressPercentage}
            onChange={(e) => onProgressChange(task.id, parseInt(e.target.value))}
            className="w-20"
          />
          <span className="text-sm">{task.progressPercentage}%</span>
        </div>

        {/* Dependencies */}
        {task.dependencies && task.dependencies.length > 0 && (
          <div className="flex items-center space-x-2">
            {task.dependencies.some(d => d.status === 'blocked') && (
              <span className="text-red-500 text-xs flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                Blocked
              </span>
            )}
            <span className="text-gray-500 text-xs">
              {task.dependencies.length} {task.dependencies.length === 1 ? 'dependency' : 'dependencies'}
            </span>
          </div>
        )}

        {/* Edit Button */}
        <button
          onClick={() => onEdit(task)}
          className="text-blue-500 hover:text-blue-700"
        >
          Edit
        </button>

        {/* Status Badge */}
        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(task.status)}`}>
          {task.status.replace('_', ' ')}
        </span>
      </div>
    </div>
  );
};

// Create Task Modal Component
const CreateTaskModal: React.FC<{
  projectId: string;
  phaseId: string | null;
  phases: Phase[];
  existingTasks: Task[];
  availableUsers: User[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ projectId, phaseId, phases, existingTasks, availableUsers, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    phaseId: phaseId || '',
    priority: 'medium',
    assignmentType: 'internal',
    vendorName: '',
    assignedTo: '',
    estimatedHours: 0,
    plannedStartDate: '',
    plannedEndDate: '',
  });
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [currentDependency, setCurrentDependency] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      // Convert empty strings to null for optional fields
      phaseId: formData.phaseId || null,
      assignedTo: formData.assignedTo || null,
      plannedStartDate: formData.plannedStartDate || null,
      plannedEndDate: formData.plannedEndDate || null,
      vendorName: formData.vendorName || null,
      dependencies: dependencies, // Pass as array of strings
    };

    console.log('Sending task data:', payload);

    try {
      await api.get(`/projects/${projectId}/tasks`, {
        method: 'POST',
        body: payload
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Create New Task</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Task Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Phase</label>
              <select
                value={formData.phaseId}
                onChange={(e) => setFormData({...formData, phaseId: e.target.value})}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">No Phase</option>
                {phases.map(phase => (
                  <option key={phase.id} value={phase.id}>{phase.phaseName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className="w-full border rounded px-3 py-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Assignment Type</label>
            <select
              value={formData.assignmentType}
              onChange={(e) => {
                const newAssignmentType = e.target.value;
                setFormData({
                  ...formData,
                  assignmentType: newAssignmentType,
                  // Only clear the opposite field, preserve the current one
                  assignedTo: newAssignmentType === 'vendor' ? '' : formData.assignedTo,
                  vendorName: newAssignmentType === 'internal' ? '' : formData.vendorName
                });
              }}
              className="w-full border rounded px-3 py-2"
            >
              <option value="internal">Internal Team Member</option>
              <option value="vendor">Vendor/Partner</option>
            </select>
          </div>

          {formData.assignmentType === 'internal' ? (
            <div>
              <label className="block text-sm font-medium mb-1">Assign To</label>
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Unassigned</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">Vendor Name</label>
              <input
                type="text"
                value={formData.vendorName}
                onChange={(e) => setFormData({...formData, vendorName: e.target.value})}
                placeholder="e.g., Accenture, IBM, TCS"
                className="w-full border rounded px-3 py-2"
                required={true}
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Estimated Hours</label>
              <input
                type="number"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({...formData, estimatedHours: parseInt(e.target.value)})}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={formData.plannedStartDate}
                onChange={(e) => setFormData({...formData, plannedStartDate: e.target.value})}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                value={formData.plannedEndDate}
                onChange={(e) => setFormData({...formData, plannedEndDate: e.target.value})}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Dependencies</label>

            {/* Input for adding dependencies */}
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={currentDependency}
                onChange={(e) => setCurrentDependency(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (currentDependency.trim()) {
                      setDependencies([...dependencies, currentDependency.trim()]);
                      setCurrentDependency('');
                    }
                  }
                }}
                placeholder="Type dependency and press Enter (e.g., 'Client approval', 'Design complete')"
                className="flex-1 border rounded px-3 py-2"
              />
              <button
                type="button"
                onClick={() => {
                  if (currentDependency.trim()) {
                    setDependencies([...dependencies, currentDependency.trim()]);
                    setCurrentDependency('');
                  }
                }}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Add
              </button>
            </div>

            {/* List of added dependencies */}
            {dependencies.length > 0 && (
              <div className="border rounded p-2 bg-gray-50 max-h-32 overflow-y-auto">
                {dependencies.map((dep, index) => (
                  <div key={index} className="flex justify-between items-center py-1">
                    <span className="text-sm">{dep}</span>
                    <button
                      type="button"
                      onClick={() => setDependencies(dependencies.filter((_, i) => i !== index))}
                      className="text-red-500 hover:text-red-700 text-sm px-2"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-500 mt-1">
              Add any dependencies: approvals, vendor deliverables, other tasks, or external requirements
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Task Modal Component
const EditTaskModal: React.FC<{
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onSave: (updatedTask: Task) => void;
  phases: Phase[];
  availableUsers: User[];
}> = ({ task, open, onClose, onSave, phases, availableUsers }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    phaseId: '',
    priority: 'medium',
    assignmentType: 'internal' as 'internal' | 'vendor',
    assignedTo: '',
    vendorName: '',
    estimatedHours: 0,
    plannedStartDate: '',
    plannedEndDate: '',
    status: 'not_started',
    progress: 0
  });

  // Update formData when task changes
  React.useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        phaseId: task.phaseId || '',
        priority: task.priority || 'medium',
        assignmentType: task.assignmentType || 'internal',
        assignedTo: task.assignedTo || '',
        vendorName: task.vendorName || '',
        estimatedHours: task.estimatedHours || 0,
        plannedStartDate: task.plannedStartDate || '',
        plannedEndDate: task.plannedEndDate || '',
        status: task.status || 'not_started',
        progress: task.progressPercentage || 0
      });
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (task) {
      await onSave({ ...task, ...formData });
    }
  };

  if (!open || !task) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Edit Task</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
            <label className="block text-sm font-medium mb-1">Phase</label>
            <select
              value={formData.phaseId}
              onChange={(e) => setFormData({ ...formData, phaseId: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">No Phase</option>
              {phases.map(phase => (
                <option key={phase.id} value={phase.id}>
                  {phase.phaseName}
                </option>
              ))}
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

          <div>
            <label className="block text-sm font-medium mb-1">Assignment Type</label>
            <select
              value={formData.assignmentType}
              onChange={(e) => setFormData({
                ...formData,
                assignmentType: e.target.value,
                assignedTo: e.target.value === 'vendor' ? '' : formData.assignedTo,
                vendorName: e.target.value === 'internal' ? '' : formData.vendorName
              })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="internal">Internal Team Member</option>
              <option value="vendor">Vendor/Partner</option>
            </select>
          </div>

          {formData.assignmentType === 'internal' ? (
            <div>
              <label className="block text-sm font-medium mb-1">Assign To</label>
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Unassigned</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">Vendor Name</label>
              <input
                type="text"
                value={formData.vendorName}
                onChange={(e) => setFormData({...formData, vendorName: e.target.value})}
                placeholder="e.g., Accenture, IBM, TCS"
                className="w-full border rounded px-3 py-2"
                required={true}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Estimated Hours</label>
            <input
              type="number"
              value={formData.estimatedHours}
              onChange={(e) => setFormData({ ...formData, estimatedHours: Number(e.target.value) })}
              className="w-full border rounded px-3 py-2"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="blocked">Blocked</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Progress (%)</label>
            <input
              type="number"
              value={formData.progress}
              onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
              className="w-full border rounded px-3 py-2"
              min="0"
              max="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Planned Start Date</label>
            <input
              type="date"
              value={formData.plannedStartDate}
              onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Planned End Date</label>
            <input
              type="date"
              value={formData.plannedEndDate}
              onChange={(e) => setFormData({ ...formData, plannedEndDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Task Detail Panel Component (simplified for brevity)
const TaskDetailPanel: React.FC<{
  task: Task;
  onClose: () => void;
  onUpdate: () => void;
}> = ({ task, onClose, onUpdate }) => {
  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 overflow-y-auto">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold">{task.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
        </div>

        {/* Task details implementation here */}
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500">Status</label>
            <p className="font-medium">{task.status}</p>
          </div>

          <div>
            <label className="text-sm text-gray-500">Progress</label>
            <p className="font-medium">{task.progressPercentage}%</p>
          </div>

          {/* Add more task details as needed */}
        </div>
      </div>
    </div>
  );
};

// Helper function
function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return 'text-green-600 bg-green-50';
    case 'in_progress': return 'text-blue-600 bg-blue-50';
    case 'blocked': return 'text-red-600 bg-red-50';
    case 'not_started': return 'text-gray-600 bg-gray-50';
    default: return 'text-gray-600 bg-gray-50';
  }
}

function getPriorityIcon(priority: string): JSX.Element | null {
  switch (priority) {
    case 'critical': return <Flag className="h-4 w-4 text-red-500" />;
    case 'high': return <Flag className="h-4 w-4 text-orange-500" />;
    case 'medium': return <Flag className="h-4 w-4 text-yellow-500" />;
    case 'low': return <Flag className="h-4 w-4 text-gray-400" />;
    default: return null;
  }
}

export default TaskManagement;
