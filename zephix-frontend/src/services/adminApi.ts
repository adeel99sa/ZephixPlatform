import { apiClient } from '@/lib/api/client';

class AdminApiService {
  async getStats() {
    const { data } = await apiClient.get('/admin/stats');
    return data as {
      userCount: number;
      templateCount: number;
      projectCount: number;
      lastActivity: string;
    };
  }

  async getUsers(params?: { page?: number; limit?: number; search?: string }) {
    const { data } = await apiClient.get('/admin/users', { params });
    return data as {
      data: Array<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        isActive: boolean;
        createdAt: string;
        lastLoginAt: string;
        organizationId: string;
        organization: string;
      }>;
      meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    };
  }

  async createAuditLog(action: string, details: any) {
    const { data } = await apiClient.post('/admin/audit', { 
      action, 
      details, 
      timestamp: new Date().toISOString() 
    });
    return data as { success: boolean };
  }
}

export const adminApi = new AdminApiService();
