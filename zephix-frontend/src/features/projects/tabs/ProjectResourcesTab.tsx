/**
 * ProjectResourcesTab
 *
 * Resources tab content - displays team allocations and resource management.
 * Write operations are behind feature flag (resourcesEnabled).
 */

import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Users, Plus, RefreshCw, Calendar, Trash2, MoreVertical, Check, X } from 'lucide-react';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { useWorkspaceStore } from '@/state/workspace.store';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import { isResourcesEnabled } from '@/lib/flags';
import {
  useProjectAllocations,
  type ResourceAllocation,
  type CreateAllocationInput,
} from '@/features/resources/allocations';
import { AllocationModal } from '@/features/resources/allocations/AllocationModal';

// --- Allocation Row Component ---

interface AllocationRowProps {
  allocation: ResourceAllocation;
  canWrite: boolean;
  isAdmin: boolean;
  resourcesEnabled: boolean;
  onUpdate: (id: string, percent: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const AllocationRow: React.FC<AllocationRowProps> = ({
  allocation,
  canWrite,
  isAdmin,
  resourcesEnabled,
  onUpdate,
  onDelete,
}) => {
  const [editing, setEditing] = useState(false);
  const [editPercent, setEditPercent] = useState(allocation.allocationPercent);
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isOptimistic = allocation.id.startsWith('temp-');

  const handleSavePercent = async () => {
    if (editPercent === allocation.allocationPercent) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onUpdate(allocation.id, editPercent);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSavePercent();
    } else if (e.key === 'Escape') {
      setEditPercent(allocation.allocationPercent);
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    await onDelete(allocation.id);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div
      className={`p-4 border-b last:border-b-0 flex items-center gap-4 ${
        isOptimistic ? 'opacity-60' : ''
      } ${saving ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <Users className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900 truncate">
              User: {allocation.userId.slice(0, 8)}...
            </p>
            <p className="text-xs text-gray-500">
              Added {new Date(allocation.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Allocation Percent */}
      <div className="w-24 text-center">
        {editing && resourcesEnabled && canWrite ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              value={editPercent}
              onChange={(e) => setEditPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              onKeyDown={handleKeyDown}
              onBlur={handleSavePercent}
              className="w-16 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
            <span className="text-gray-500">%</span>
          </div>
        ) : (
          <button
            onClick={() => resourcesEnabled && canWrite && setEditing(true)}
            className={`text-lg font-semibold ${
              resourcesEnabled && canWrite ? 'hover:text-indigo-600 cursor-pointer' : ''
            }`}
            disabled={!resourcesEnabled || !canWrite}
          >
            {allocation.allocationPercent}%
          </button>
        )}
      </div>

      {/* Date Range */}
      <div className="w-40 text-sm text-gray-500 flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        {formatDate(allocation.startDate)} – {formatDate(allocation.endDate)}
      </div>

      {/* Actions Menu (Admin only, flag enabled) */}
      {resourcesEnabled && isAdmin && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded hover:bg-gray-100"
          >
            <MoreVertical className="h-4 w-4 text-gray-500" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border rounded-md shadow-lg z-10 min-w-32">
              <button
                onClick={() => {
                  setShowMenu(false);
                  setConfirmDelete(true);
                }}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="font-semibold text-lg mb-2">Remove Allocation?</h3>
            <p className="text-gray-600 text-sm mb-4">
              This will remove the resource allocation from this project.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main Component ---

export const ProjectResourcesTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { canWrite, role } = useWorkspaceRole(activeWorkspaceId);
  const isAdmin = role === 'ADMIN' || role === 'OWNER';

  const resourcesEnabled = isResourcesEnabled();

  const {
    allocations,
    loading,
    error,
    refetch,
    createAllocationOptimistic,
    updateAllocationOptimistic,
    deleteAllocationOptimistic,
  } = useProjectAllocations({ projectId });

  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateAllocation = useCallback(
    async (input: CreateAllocationInput) => {
      await createAllocationOptimistic(input);
    },
    [createAllocationOptimistic]
  );

  const handleUpdateAllocation = useCallback(
    async (id: string, percent: number) => {
      await updateAllocationOptimistic(id, { allocationPercent: percent });
    },
    [updateAllocationOptimistic]
  );

  const handleDeleteAllocation = useCallback(
    async (id: string) => {
      await deleteAllocationOptimistic(id);
    },
    [deleteAllocationOptimistic]
  );

  // Loading state
  if (loading && allocations.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // Error state
  if (error && allocations.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <EmptyState
          title="Failed to load resources"
          description={error}
          icon={<Users className="h-12 w-12 text-red-400" />}
          action={
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          }
        />
      </div>
    );
  }

  // Empty state
  if (allocations.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <EmptyState
          title="No resources allocated"
          description="Allocate team members to this project to track their time and availability."
          icon={<Users className="h-12 w-12" />}
          action={
            resourcesEnabled && canWrite ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Add Resource
              </button>
            ) : undefined
          }
        />

        {showCreateModal && projectId && (
          <AllocationModal
            projectId={projectId}
            existingUserIds={allocations.map((a) => a.userId)}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateAllocation}
          />
        )}
      </div>
    );
  }

  // Allocations list
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Team Resources ({allocations.length})
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {resourcesEnabled && canWrite && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Add Resource
            </button>
          )}
        </div>
      </div>

      {/* Table Header */}
      <div className="bg-gray-50 rounded-t-lg border border-b-0 px-4 py-2 flex items-center gap-4 text-sm font-medium text-gray-500">
        <div className="flex-1">Team Member</div>
        <div className="w-24 text-center">Allocation</div>
        <div className="w-40">Date Range</div>
        {resourcesEnabled && isAdmin && <div className="w-8" />}
      </div>

      {/* Allocations List */}
      <div className="bg-white rounded-b-lg border border-t-0 divide-y">
        {allocations.map((allocation) => (
          <AllocationRow
            key={allocation.id}
            allocation={allocation}
            canWrite={canWrite}
            isAdmin={isAdmin}
            resourcesEnabled={resourcesEnabled}
            onUpdate={handleUpdateAllocation}
            onDelete={handleDeleteAllocation}
          />
        ))}
      </div>

      {showCreateModal && projectId && (
        <AllocationModal
          projectId={projectId}
          existingUserIds={allocations.map((a) => a.userId)}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateAllocation}
        />
      )}
    </div>
  );
};

export default ProjectResourcesTab;
