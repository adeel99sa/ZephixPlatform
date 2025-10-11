import { api } from './api';

export const dashboardService = {
  async getHomeData(organizationId: string) {
    const response = await api.get(`/dashboard/home`, {
      params: { organizationId }
    });
    return response.data;
  },

  async getRecentActivity(organizationId: string, limit = 6) {
    const response = await api.get(`/dashboard/recent`, {
      params: { organizationId, limit }
    });
    return response.data;
  },

  async getActionItems(organizationId: string) {
    const response = await api.get(`/dashboard/action-items`, {
      params: { organizationId }
    });
    return response.data;
  },

  async getQuickStats(organizationId: string) {
    const response = await api.get(`/dashboard/stats`, {
      params: { organizationId }
    });
    return response.data;
  }
};




