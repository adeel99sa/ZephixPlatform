/**
 * Project Sprints Tab – List, create, and manage sprints.
 * Shows sprint list with stats. Allows creating new sprints and assigning tasks.
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import {
  listSprints,
  createSprint,
  updateSprint,
  deleteSprint,
  assignTasksToSprint,
  removeTasksFromSprint,
  getSprintCapacity,
  getProjectVelocity,
  type Sprint,
  type SprintStatus,
  type SprintCapacity,
  type VelocityData,
  type CreateSprintInput,
} from '@/features/work-management/sprints.api';
import { listTasks, type WorkTask } from '@/features/work-management/workTasks.api';

const STATUS_COLORS: Record<SprintStatus, string> = {
  PLANNING: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

const STATUS_LABELS: Record<SprintStatus, string> = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export default function ProjectSprintsTab() {
  const { projectId } = useParams<{ projectId: string }>();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedSprint, setExpandedSprint] = useState<string | null>(null);
  const [sprintTasks, setSprintTasks] = useState<Record<string, WorkTask[]>>({});
  const [backlogTasks, setBacklogTasks] = useState<WorkTask[]>([]);
  const [capacityData, setCapacityData] = useState<Record<string, SprintCapacity>>({});
  const [velocityData, setVelocityData] = useState<VelocityData | null>(null);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [creating, setCreating] = useState(false);

  const loadSprints = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const data = await listSprints(projectId);
      setSprints(data);
      // Load velocity in parallel
      getProjectVelocity(projectId, 5)
        .then(setVelocityData)
        .catch(() => {}); // non-critical
    } catch (err: any) {
      toast.error('Failed to load sprints');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSprints();
  }, [loadSprints]);

  // Load tasks for expanded sprint
  const loadSprintTasks = useCallback(async (sprintId: string) => {
    if (!projectId) return;
    try {
      const all = await listTasks({ projectId });
      const items = all?.items ?? [];
      const inSprint = items.filter((t) => t.sprintId === sprintId);
      const notInAnySprint = items.filter((t) => !t.sprintId && !t.deletedAt);
      setSprintTasks((prev) => ({ ...prev, [sprintId]: inSprint }));
      setBacklogTasks(notInAnySprint);
    } catch {
      toast.error('Failed to load tasks');
    }
  }, [projectId]);

  const handleExpand = (sprintId: string) => {
    if (expandedSprint === sprintId) {
      setExpandedSprint(null);
    } else {
      setExpandedSprint(sprintId);
      loadSprintTasks(sprintId);
      // Load capacity
      getSprintCapacity(sprintId)
        .then((cap) => setCapacityData((prev) => ({ ...prev, [sprintId]: cap })))
        .catch(() => {}); // non-critical
    }
  };

  const handleCreate = async () => {
    if (!projectId || !newName.trim() || !newStart || !newEnd) return;
    setCreating(true);
    try {
      const input: CreateSprintInput = {
        projectId,
        name: newName.trim(),
        goal: newGoal.trim() || undefined,
        startDate: newStart,
        endDate: newEnd,
      };
      const created = await createSprint(input);
      setSprints((prev) => [created, ...prev]);
      setShowCreate(false);
      setNewName('');
      setNewGoal('');
      setNewStart('');
      setNewEnd('');
      toast.success(`Sprint "${created.name}" created`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create sprint';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (sprint: Sprint, newStatus: SprintStatus) => {
    try {
      const updated = await updateSprint(sprint.id, { status: newStatus });
      setSprints((prev) => prev.map((s) => (s.id === sprint.id ? { ...s, ...updated } : s)));
      toast.success(`Sprint moved to ${STATUS_LABELS[newStatus]}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to update sprint';
      toast.error(msg);
    }
  };

  const handleDelete = async (sprint: Sprint) => {
    if (!confirm(`Delete sprint "${sprint.name}"?`)) return;
    try {
      await deleteSprint(sprint.id);
      setSprints((prev) => prev.filter((s) => s.id !== sprint.id));
      toast.success('Sprint deleted');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete sprint');
    }
  };

  const handleAssignTask = async (sprintId: string, taskId: string) => {
    try {
      await assignTasksToSprint(sprintId, [taskId]);
      await loadSprintTasks(sprintId);
      toast.success('Task assigned to sprint');
    } catch (err: any) {
      toast.error('Failed to assign task');
    }
  };

  const handleRemoveTask = async (sprintId: string, taskId: string) => {
    try {
      await removeTasksFromSprint(sprintId, [taskId]);
      await loadSprintTasks(sprintId);
      toast.success('Task removed from sprint');
    } catch (err: any) {
      toast.error('Failed to remove task');
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading sprints...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Sprints</h2>
        <Button onClick={() => setShowCreate(!showCreate)} variant="primary" size="sm">
          {showCreate ? 'Cancel' : '+ New Sprint'}
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
              <input
                className="w-full px-3 py-2 text-sm border rounded-md"
                placeholder="Sprint 1"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Goal</label>
              <input
                className="w-full px-3 py-2 text-sm border rounded-md"
                placeholder="Ship user auth..."
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm border rounded-md"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date *</label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm border rounded-md"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={creating || !newName.trim() || !newStart || !newEnd} size="sm">
            {creating ? 'Creating...' : 'Create Sprint'}
          </Button>
        </div>
      )}

      {/* Velocity Panel */}
      {velocityData && velocityData.sprints.length > 0 && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase">Velocity</h3>
            <div className="text-right">
              <span className="text-2xl font-bold text-indigo-600">
                {velocityData.rollingAverageCompletedPoints}
              </span>
              <span className="text-sm text-gray-500 ml-1">SP/sprint avg</span>
            </div>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="text-left py-1">Sprint</th>
                <th className="text-right py-1">Committed</th>
                <th className="text-right py-1">Completed</th>
                <th className="text-right py-1">Rate</th>
              </tr>
            </thead>
            <tbody>
              {velocityData.sprints.map((vs) => (
                <tr key={vs.sprintId} className="border-b border-gray-100">
                  <td className="py-1 text-gray-700">{vs.name}</td>
                  <td className="py-1 text-right">{vs.committedStoryPoints} SP</td>
                  <td className="py-1 text-right font-medium">{vs.completedStoryPoints} SP</td>
                  <td className="py-1 text-right text-gray-500">
                    {vs.committedStoryPoints > 0
                      ? Math.round((vs.completedStoryPoints / vs.committedStoryPoints) * 100)
                      : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sprint List */}
      {sprints.length === 0 ? (
        <p className="text-gray-500 text-sm">No sprints yet. Create one to start planning.</p>
      ) : (
        <div className="space-y-3">
          {sprints.map((sprint) => (
            <div key={sprint.id} className="border rounded-lg bg-white">
              {/* Sprint Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => handleExpand(sprint.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{sprint.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[sprint.status]}`}>
                    {STATUS_LABELS[sprint.status]}
                  </span>
                  {sprint.stats && (
                    <span className="text-xs text-gray-500">
                      {sprint.stats.completed}/{sprint.stats.committed} SP
                      ({sprint.stats.taskCount} tasks)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>
                    {new Date(sprint.startDate).toLocaleDateString()} – {new Date(sprint.endDate).toLocaleDateString()}
                  </span>
                  {sprint.status === 'PLANNING' && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(sprint, 'ACTIVE'); }}
                        className="text-green-600 hover:text-green-800 font-medium"
                      >
                        Start
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(sprint); }}
                        className="text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  {sprint.status === 'ACTIVE' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStatusChange(sprint, 'COMPLETED'); }}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded: Sprint Tasks + Backlog */}
              {expandedSprint === sprint.id && (
                <div className="border-t p-4 space-y-4">
                  {sprint.goal && (
                    <p className="text-sm text-gray-600 italic">Goal: {sprint.goal}</p>
                  )}

                  {/* Capacity Panel */}
                  {capacityData[sprint.id] && (
                    <div className="grid grid-cols-3 gap-3 p-3 bg-blue-50 rounded-lg">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 uppercase">Capacity</div>
                        <div className="text-lg font-semibold text-blue-700">
                          {capacityData[sprint.id].capacityHours}h
                        </div>
                        <div className="text-xs text-gray-400">
                          {capacityData[sprint.id].capacityBasis.workdays} days × {capacityData[sprint.id].capacityBasis.hoursPerDay}h/day
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 uppercase">Load</div>
                        <div className="text-lg font-semibold text-orange-600">
                          {capacityData[sprint.id].loadHours}h
                        </div>
                        <div className="text-xs text-gray-400">
                          {capacityData[sprint.id].committedStoryPoints} SP × {capacityData[sprint.id].capacityBasis.pointsToHoursRatio}h
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 uppercase">Remaining</div>
                        <div className={`text-lg font-semibold ${capacityData[sprint.id].remainingHours >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {capacityData[sprint.id].remainingHours}h
                        </div>
                        <div className="text-xs text-gray-400">
                          {capacityData[sprint.id].completedStoryPoints}/{capacityData[sprint.id].committedStoryPoints} SP done
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tasks in Sprint */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase">
                      Sprint Tasks ({sprintTasks[sprint.id]?.length || 0})
                    </h4>
                    {(sprintTasks[sprint.id] || []).length === 0 ? (
                      <p className="text-xs text-gray-400">No tasks assigned yet.</p>
                    ) : (
                      <div className="space-y-1">
                        {(sprintTasks[sprint.id] || []).map((task) => (
                          <div key={task.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded text-sm">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${task.status === 'DONE' ? 'bg-green-500' : task.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                              <span>{task.title}</span>
                              {task.storyPoints != null && (
                                <span className="text-xs text-blue-600 font-medium">{task.storyPoints} SP</span>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveTask(sprint.id, task.id)}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Backlog (unassigned tasks) */}
                  {(sprint.status === 'PLANNING' || sprint.status === 'ACTIVE') && backlogTasks.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase">
                        Backlog ({backlogTasks.length} unassigned)
                      </h4>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {backlogTasks.map((task) => (
                          <div key={task.id} className="flex items-center justify-between px-3 py-2 border rounded text-sm">
                            <div className="flex items-center gap-2">
                              <span>{task.title}</span>
                              {task.storyPoints != null && (
                                <span className="text-xs text-blue-600">{task.storyPoints} SP</span>
                              )}
                            </div>
                            <button
                              onClick={() => handleAssignTask(sprint.id, task.id)}
                              className="text-xs text-green-600 hover:text-green-800 font-medium"
                            >
                              + Add
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
