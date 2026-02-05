import { apiClient } from '@/lib/api/client';
import { Resource, ResourceAllocation, AllocationConflict } from '../types/resource.types';

export const resourceService = {
  async getResources(): Promise<Resource[]> {
    // apiClient.get returns response.data directly
    const response = await apiClient.get<{ data: Resource[] }>('/resources');
    // Backend returns { data: Resource[] }
    return response.data?.data ?? response.data ?? [];
  },

  async getResourceAllocations(resourceId: string, startDate: string, endDate: string): Promise<unknown> {
    const response = await apiClient.get(`/resources/${resourceId}/timeline`, {
      params: { startDate, endDate }
    });
    return response.data;
  },

  async checkConflicts(
    resourceId: string,
    startDate: string,
    endDate: string,
    estimatedHours: number
  ): Promise<AllocationConflict | null> {
    const response = await apiClient.post<{ data: AllocationConflict | null }>('/resources/check-conflicts', {
      resourceId,
      startDate,
      endDate,
      estimatedHours
    });
    // Backend returns { data: AllocationConflict }
    return (response.data?.data ?? response.data ?? null) as AllocationConflict | null;
  },

  /**
   * @deprecated Use useGovernedAllocationMutation hook instead for automatic justification handling
   */
  async createAllocation(allocation: {
    taskId: string;
    resourceId: string;
    startDate: string;
    endDate: string;
    hoursPerWeek: number;
    allocationPercentage?: number;
    type?: 'HARD' | 'SOFT' | 'GHOST';
    bookingSource?: 'MANUAL' | 'JIRA' | 'GITHUB' | 'AI';
    justification?: string;
  }): Promise<ResourceAllocation> {
    const response = await apiClient.post<{ data: ResourceAllocation } | ResourceAllocation>('/resources/allocations', allocation);
    return (response as any)?.data || response;
  }
};
