import { api } from './api';

export interface TimelineTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  dependencies?: string[];
  resourceId?: string;
  isCritical?: boolean;
  isMilestone?: boolean;
}

export const timelineService = {
  getTimelineData: async (projectId: string) => {
    const response = await api.get(`/timeline/project/${projectId}`);
    return response.data;
  },

  createDependency: async (predecessorId: string, successorId: string) => {
    return await api.post('/timeline/dependency', {
      predecessorId,
      successorId,
      dependencyType: 'finish_to_start'
    });
  },

  moveTask: async (taskId: string, newStartDate: string) => {
    return await api.post(`/timeline/task/${taskId}/move`, {
      newStartDate
    });
  },

  deleteDependency: async (dependencyId: string) => {
    return await api.delete(`/timeline/dependency/${dependencyId}`);
  }
};