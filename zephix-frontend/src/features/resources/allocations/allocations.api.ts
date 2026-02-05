/**
 * Resource Allocations API – single source of truth for allocation CRUD.
 * All calls use api from @/lib/api (x-workspace-id set by interceptor).
 * Fail fast if no active workspace; do not send the request.
 */

import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/state/workspace.store';
import type {
  ResourceAllocation,
  CreateAllocationInput,
  UpdateAllocationInput,
  ListAllocationsParams,
  ListAllocationsResponse,
} from './types';

// --- Workspace invariant helper ---

function requireActiveWorkspace(): string {
  const wsId = useWorkspaceStore.getState().activeWorkspaceId;
  if (!wsId) {
    const err = new Error('Active workspace required');
    (err as unknown as { code: string }).code = 'WORKSPACE_REQUIRED';
    throw err;
  }
  return wsId;
}

// --- API Functions ---

/**
 * List allocations for a project.
 * Requires projectId.
 */
export async function listAllocations(params: ListAllocationsParams): Promise<ListAllocationsResponse> {
  requireActiveWorkspace();

  const queryParams = new URLSearchParams();
  queryParams.set('projectId', params.projectId);

  const res = await api.get(`/work/resources/allocations?${queryParams.toString()}`);
  return res.data;
}

/**
 * Create a new allocation.
 * Feature flagged - only call when resourcesEnabled is true.
 */
export async function createAllocation(input: CreateAllocationInput): Promise<ResourceAllocation> {
  requireActiveWorkspace();

  const res = await api.post('/work/resources/allocations', input);
  return res.data;
}

/**
 * Update an existing allocation.
 * Feature flagged - only call when resourcesEnabled is true.
 */
export async function updateAllocation(
  allocationId: string,
  input: UpdateAllocationInput
): Promise<ResourceAllocation> {
  requireActiveWorkspace();

  const res = await api.patch(`/work/resources/allocations/${allocationId}`, input);
  return res.data;
}

/**
 * Delete an allocation (Admin only).
 * Feature flagged - only call when resourcesEnabled is true.
 */
export async function deleteAllocation(allocationId: string): Promise<void> {
  requireActiveWorkspace();

  await api.delete(`/work/resources/allocations/${allocationId}`);
}

/**
 * Generate a temporary ID for optimistic updates.
 */
export function generateTempAllocationId(): string {
  return `temp-alloc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
