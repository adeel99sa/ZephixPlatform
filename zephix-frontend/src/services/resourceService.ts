import { apiClient } from './auth.interceptor';
import { Resource, ResourceAllocation, AllocationConflict } from '../types/resource.types';

export const resourceService = {
  async getResources(): Promise<Resource[]> {
    const response = await apiClient.get('/resources');
    return response.data.data || [];
  },

  async getResourceAllocations(resourceId: string, startDate: string, endDate: string): Promise<any> {
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
    const response = await apiClient.post('/resources/check-conflicts', {
      resourceId,
      startDate,
      endDate,
      estimatedHours
    });
    return response.data;
  },

  async createAllocation(allocation: {
    taskId: string;
    resourceId: string;
    startDate: string;
    endDate: string;
    hoursPerWeek: number;
  }): Promise<ResourceAllocation> {
    const response = await apiClient.post('/resources/allocations', allocation);
    return response.data;
  }
};
