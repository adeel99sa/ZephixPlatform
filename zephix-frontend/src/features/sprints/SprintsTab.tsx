// ─────────────────────────────────────────────────────────────────────────────
// Sprints Tab — Phase 4.6
//
// List sprints, expand for capacity/velocity, create, start, complete.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Target,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  listSprints,
  createSprint,
  startSprint,
  completeSprint,
  cancelSprint,
  getVelocity,
  getCapacity,
  type Sprint,
  type VelocityResult,
  type CapacityResult,
} from './sprints.api';
import { useAuth } from '@/state/AuthContext';

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
  workspaceId: string;
}

// ─── Status badges ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  PLANNING: 'bg-blue-100 text-blue-700',
  ACTIVE: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function SprintsTab({ projectId, workspaceId }: Props) {
  const { user } = useAuth();
  const isAdmin =
    user?.platformRole === 'ADMIN' ||
    user?.platformRole === 'OWNER' ||
    user?.platformRole === 'admin' ||
    user?.platformRole === 'owner';

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [velocity, setVelocity] = useState<VelocityResult | null>(null);
  const [capacity, setCapacity] = useState<CapacityResult | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [busy, setBusy] = useState(false);

  const loadSprints = useCallback(async () => {
    try {
      const data = await listSprints(projectId);
      setSprints(data);
    } catch {
      toast.error('Failed to load sprints');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadSprints();
  }, [loadSprints]);

  // Load velocity once
  useEffect(() => {
    getVelocity(projectId).then(setVelocity).catch(() => {});
  }, [projectId]);

  const handleExpand = async (sprint: Sprint) => {
    if (expandedId === sprint.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(sprint.id);
    try {
      const cap = await getCapacity(sprint.id);
      setCapacity(cap);
    } catch {
      setCapacity(null);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await createSprint(projectId, {
        name: newName.trim(),
        goal: newGoal.trim() || undefined,
      });
      toast.success('Sprint created');
      setShowCreate(false);
      setNewName('');
      setNewGoal('');
      await loadSprints();
    } catch {
      toast.error('Failed to create sprint');
    } finally {
      setBusy(false);
    }
  };

  const handleStart = async (id: string) => {
    setBusy(true);
    try {
      await startSprint(id);
      toast.success('Sprint started');
      await loadSprints();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to start sprint');
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async (id: string) => {
    setBusy(true);
    try {
      await completeSprint(id);
      toast.success('Sprint completed');
      await loadSprints();
      // Refresh velocity
      getVelocity(projectId).then(setVelocity).catch(() => {});
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || 'Failed to complete sprint',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (id: string) => {
    setBusy(true);
    try {
      await cancelSprint(id);
      toast.success('Sprint cancelled');
      await loadSprints();
    } catch {
      toast.error('Failed to cancel sprint');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="sprints-tab">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Sprints</h3>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="inline-flex items-center gap-1 rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-3.5 w-3.5" /> New Sprint
          </button>
        )}
      </div>

      {/* Velocity summary */}
      {velocity && velocity.rollingAverage > 0 && (
        <div className="flex items-center gap-2 rounded border border-green-200 bg-green-50 px-3 py-2 text-xs">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <span className="text-green-800 font-medium">
            Rolling velocity: {velocity.rollingAverage} pts/sprint
          </span>
          <span className="text-green-600">
            (last {velocity.sprints.length} sprints)
          </span>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="border rounded-lg p-4 bg-white space-y-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Sprint name"
            className="w-full rounded border px-3 py-2 text-sm"
            data-testid="sprint-name-input"
          />
          <input
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            placeholder="Sprint goal (optional)"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={busy || !newName.trim()}
              className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="text-xs text-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sprint list */}
      {sprints.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">
          No sprints yet. Create one to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {sprints.map((sprint) => (
            <div
              key={sprint.id}
              className="border rounded-lg bg-white"
              data-testid="sprint-row"
            >
              {/* Row */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => handleExpand(sprint)}
              >
                <div className="flex items-center gap-2">
                  {expandedId === sprint.id ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm font-medium text-gray-900">
                    {sprint.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${STATUS_STYLES[sprint.status] || 'bg-gray-100'}`}
                  >
                    {sprint.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {sprint.committedPoints != null && (
                    <span className="text-xs text-gray-500">
                      {sprint.completedPoints ?? 0}/{sprint.committedPoints} pts
                    </span>
                  )}
                  {isAdmin && sprint.status === 'PLANNING' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStart(sprint.id);
                      }}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded bg-green-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      <Play className="h-3 w-3" /> Start
                    </button>
                  )}
                  {isAdmin && sprint.status === 'ACTIVE' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleComplete(sprint.id);
                      }}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Complete
                    </button>
                  )}
                  {isAdmin &&
                    (sprint.status === 'PLANNING' ||
                      sprint.status === 'ACTIVE') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancel(sprint.id);
                        }}
                        disabled={busy}
                        className="rounded px-2 py-1 text-[10px] text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <XCircle className="h-3 w-3" />
                      </button>
                    )}
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === sprint.id && (
                <div className="border-t px-4 py-3 space-y-3">
                  {sprint.goal && (
                    <div>
                      <span className="text-xs font-medium text-gray-500">
                        Goal
                      </span>
                      <p className="text-sm text-gray-800">{sprint.goal}</p>
                    </div>
                  )}

                  {/* Capacity panel */}
                  {capacity && capacity.sprintId === sprint.id && (
                    <div className="grid grid-cols-3 gap-3" data-testid="capacity-panel">
                      <div className="rounded border p-2 text-center">
                        <p className="text-lg font-bold text-indigo-600">
                          {capacity.committedPoints}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Committed
                        </p>
                      </div>
                      <div className="rounded border p-2 text-center">
                        <p className="text-lg font-bold text-green-600">
                          {capacity.completedPoints}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Completed
                        </p>
                      </div>
                      <div className="rounded border p-2 text-center">
                        <p className="text-lg font-bold text-amber-600">
                          {capacity.remainingPoints}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Remaining
                        </p>
                      </div>
                      <div className="col-span-3 flex justify-between text-xs text-gray-500 px-1">
                        <span>Tasks: {capacity.taskCount}</span>
                        <span>Done: {capacity.doneTaskCount}</span>
                        <span>Basis: {capacity.basis}</span>
                      </div>
                    </div>
                  )}

                  {/* Velocity panel */}
                  {velocity && velocity.sprints.length > 0 && (
                    <div data-testid="velocity-panel">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                        Velocity History
                      </h4>
                      <div className="flex gap-2">
                        {velocity.sprints.map((v) => (
                          <div
                            key={v.id}
                            className="rounded border px-2 py-1 text-xs"
                          >
                            <span className="font-medium">{v.name}</span>:{' '}
                            {v.completedPoints}/{v.committedPoints}
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
