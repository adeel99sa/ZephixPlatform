/**
 * Resource Allocations Hooks – Custom React hooks for allocation data fetching and mutations.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  listAllocations,
  createAllocation,
  updateAllocation,
  deleteAllocation,
  generateTempAllocationId,
} from './allocations.api';
import type { ResourceAllocation, CreateAllocationInput, UpdateAllocationInput } from './types';
import { useWorkspaceStore } from '@/state/workspace.store';
import { telemetry } from '@/lib/telemetry';

interface UseProjectAllocationsOptions {
  projectId: string | undefined;
}

interface UseProjectAllocationsResult {
  allocations: ResourceAllocation[];
  loading: boolean;
  error: string | null;
  total: number;
  refetch: () => Promise<void>;
  createAllocationOptimistic: (input: CreateAllocationInput) => Promise<ResourceAllocation | null>;
  updateAllocationOptimistic: (id: string, input: UpdateAllocationInput) => Promise<ResourceAllocation | null>;
  deleteAllocationOptimistic: (id: string) => Promise<boolean>;
}

/**
 * Hook to fetch and manage allocations for a project.
 * Does not fetch until workspace is valid and projectId exists.
 */
export function useProjectAllocations(options: UseProjectAllocationsOptions): UseProjectAllocationsResult {
  const { projectId } = options;
  const { activeWorkspaceId } = useWorkspaceStore();

  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Track mounted state to avoid state updates after unmount
  const mountedRef = useRef(true);

  // Store for rollbacks
  const rollbackAllocations = useRef<Map<string, ResourceAllocation>>(new Map());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchAllocations = useCallback(async () => {
    // Don't fetch if workspace or projectId is missing
    if (!activeWorkspaceId || !projectId) {
      setAllocations([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await listAllocations({ projectId });

      if (!mountedRef.current) return;

      setAllocations(result.items);
      setTotal(result.total);

      // Telemetry: track list loaded
      telemetry.track('resources.allocations.loaded', {
        projectId,
        count: result.items.length,
      });
    } catch (e) {
      if (!mountedRef.current) return;

      const errorMessage = (e as Error).message || 'Failed to load allocations';
      setError(errorMessage);
      setAllocations([]);
      setTotal(0);

      // Don't toast on WORKSPACE_REQUIRED - this is expected during navigation
      const code = (e as { code?: string }).code;
      if (code !== 'WORKSPACE_REQUIRED') {
        toast.error('Failed to load allocations');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [activeWorkspaceId, projectId]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  /**
   * Create an allocation with optimistic update.
   * Returns the created allocation on success, null on failure.
   */
  const createAllocationOptimistic = useCallback(
    async (input: CreateAllocationInput): Promise<ResourceAllocation | null> => {
      if (!activeWorkspaceId || !projectId) {
        toast.error('Workspace required');
        return null;
      }

      // Create optimistic allocation
      const tempId = generateTempAllocationId();
      const optimisticAllocation: ResourceAllocation = {
        id: tempId,
        organizationId: '',
        workspaceId: activeWorkspaceId,
        projectId,
        userId: input.userId,
        allocationPercent: input.allocationPercent ?? 100,
        startDate: input.startDate || null,
        endDate: input.endDate || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      // Optimistically insert
      setAllocations((prev) => [optimisticAllocation, ...prev]);
      setTotal((prev) => prev + 1);

      try {
        const created = await createAllocation(input);

        // Replace temp with real allocation
        setAllocations((prev) =>
          prev.map((a) => (a.id === tempId ? created : a))
        );

        telemetry.track('resources.allocation.create.success', { projectId, allocationId: created.id });
        toast.success('Allocation created');

        return created;
      } catch (e) {
        // Rollback optimistic insert
        setAllocations((prev) => prev.filter((a) => a.id !== tempId));
        setTotal((prev) => Math.max(0, prev - 1));

        const code = (e as { code?: string }).code || 'UNKNOWN';
        telemetry.track('resources.allocation.create.error', { projectId, code });
        toast.error('Failed to create allocation');

        return null;
      }
    },
    [activeWorkspaceId, projectId]
  );

  /**
   * Update an allocation with optimistic update.
   * Returns the updated allocation on success, null on failure.
   */
  const updateAllocationOptimistic = useCallback(
    async (allocationId: string, input: UpdateAllocationInput): Promise<ResourceAllocation | null> => {
      if (!activeWorkspaceId || !projectId) {
        toast.error('Workspace required');
        return null;
      }

      // Find current allocation for rollback
      const current = allocations.find((a) => a.id === allocationId);
      if (!current) {
        toast.error('Allocation not found');
        return null;
      }

      // Store for rollback
      rollbackAllocations.current.set(allocationId, { ...current });

      // Optimistically update
      setAllocations((prev) =>
        prev.map((a) =>
          a.id === allocationId
            ? {
                ...a,
                allocationPercent: input.allocationPercent ?? a.allocationPercent,
                startDate: input.startDate !== undefined ? input.startDate : a.startDate,
                endDate: input.endDate !== undefined ? input.endDate : a.endDate,
                updatedAt: new Date().toISOString(),
              }
            : a
        )
      );

      try {
        const updated = await updateAllocation(allocationId, input);

        // Replace with server response
        setAllocations((prev) =>
          prev.map((a) => (a.id === allocationId ? updated : a))
        );

        rollbackAllocations.current.delete(allocationId);
        telemetry.track('resources.allocation.update.success', { projectId, allocationId });

        return updated;
      } catch (e) {
        // Rollback
        const rollback = rollbackAllocations.current.get(allocationId);
        if (rollback) {
          setAllocations((prev) =>
            prev.map((a) => (a.id === allocationId ? rollback : a))
          );
          rollbackAllocations.current.delete(allocationId);
        }

        const code = (e as { code?: string }).code || 'UNKNOWN';
        telemetry.track('resources.allocation.update.error', { projectId, allocationId, code });
        toast.error('Failed to update allocation');

        return null;
      }
    },
    [activeWorkspaceId, projectId, allocations]
  );

  /**
   * Delete an allocation with optimistic update (Admin only).
   * Returns true on success, false on failure.
   */
  const deleteAllocationOptimistic = useCallback(
    async (allocationId: string): Promise<boolean> => {
      if (!activeWorkspaceId || !projectId) {
        toast.error('Workspace required');
        return false;
      }

      // Find current allocation for rollback
      const current = allocations.find((a) => a.id === allocationId);
      if (!current) {
        toast.error('Allocation not found');
        return false;
      }

      // Store for rollback
      rollbackAllocations.current.set(allocationId, { ...current });

      // Optimistically remove
      setAllocations((prev) => prev.filter((a) => a.id !== allocationId));
      setTotal((prev) => Math.max(0, prev - 1));

      try {
        await deleteAllocation(allocationId);

        rollbackAllocations.current.delete(allocationId);
        telemetry.track('resources.allocation.delete.success', { projectId, allocationId });
        toast.success('Allocation removed');

        return true;
      } catch (e) {
        // Rollback
        const rollback = rollbackAllocations.current.get(allocationId);
        if (rollback) {
          setAllocations((prev) => [rollback, ...prev]);
          setTotal((prev) => prev + 1);
          rollbackAllocations.current.delete(allocationId);
        }

        const code = (e as { code?: string }).code || 'UNKNOWN';
        telemetry.track('resources.allocation.delete.error', { projectId, allocationId, code });
        toast.error('Failed to remove allocation');

        return false;
      }
    },
    [activeWorkspaceId, projectId, allocations]
  );

  return {
    allocations,
    loading,
    error,
    total,
    refetch: fetchAllocations,
    createAllocationOptimistic,
    updateAllocationOptimistic,
    deleteAllocationOptimistic,
  };
}
