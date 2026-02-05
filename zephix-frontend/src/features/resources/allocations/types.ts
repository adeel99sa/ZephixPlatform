/**
 * Resource Allocation Types - Single source of truth for allocation type definitions.
 * Simple per-project allocation model for MVP.
 */

export interface ResourceAllocation {
  id: string;
  organizationId: string;
  workspaceId: string;
  projectId: string;
  userId: string;
  allocationPercent: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateAllocationInput {
  projectId: string;
  userId: string;
  allocationPercent?: number;
  startDate?: string;
  endDate?: string;
}

export interface UpdateAllocationInput {
  allocationPercent?: number;
  startDate?: string;
  endDate?: string;
}

export interface ListAllocationsParams {
  projectId: string;
}

export interface ListAllocationsResponse {
  items: ResourceAllocation[];
  total: number;
}

/**
 * Allocation display with user info (enriched client-side)
 */
export interface AllocationWithUser extends ResourceAllocation {
  userName?: string;
  userEmail?: string;
  userRole?: string;
}
