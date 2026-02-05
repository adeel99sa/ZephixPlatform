import { apiClient } from '@/lib/api/client';
import { unwrapData, unwrapArray } from '@/lib/api/unwrapData';
import { normalizePlatformRole } from '@/utils/roles';

/**
 * Comprehensive Admin API Service
 * Connects to all admin backend endpoints
 */
interface Stats {
  userCount: number;
  activeUsers: number;
  templateCount: number;
  projectCount: number;
  totalItems?: number;
}

interface SystemHealth {
  status: string;
  timestamp: string;
  database: string;
  services?: Record<string, string>;
  details?: string;
}

class AdminApiService {
  // ==================== Dashboard & Stats ====================
  async getStats(): Promise<Stats> {
    const response = await apiClient.get('/admin/stats');
    // Backend returns { data: Stats }
    const data = unwrapData<Stats>(response);
    return data || { userCount: 0, activeUsers: 0, templateCount: 0, projectCount: 0 };
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const response = await apiClient.get('/admin/health');
    // Backend returns { data: SystemHealth }
    const data = unwrapData<SystemHealth>(response);
    return data || { status: 'unknown', timestamp: new Date().toISOString(), database: 'unknown' };
  }

  // ==================== Organization ====================
  async getOrganizationOverview() {
    const { data } = await apiClient.get('/admin/organization/overview');
    return data;
  }

  async getUsers(params?: { page?: number; limit?: number; search?: string }) {
    const { data } = await apiClient.get('/admin/users', { params });
    return data;
  }

  async getOrganizationUsers(params?: { page?: number; limit?: number; search?: string; role?: string; status?: string }): Promise<{
    users?: Array<{ id: string; email: string; firstName?: string; lastName?: string; role?: string; status?: string }>;
    pagination?: { total: number; totalPages: number };
  }> {
    type UserData = { id: string; email: string; firstName?: string; lastName?: string; role?: string; status?: string };
    type ResponseData = { users: UserData[]; pagination: { total: number; totalPages: number } };
    const response = await apiClient.get<{ data: ResponseData }>('/admin/users', { params });
    const result = response as unknown as { data?: ResponseData };
    return result?.data ?? { users: [], pagination: { total: 0, totalPages: 0 } };
  }

  async getAllUsersForAdmin() {
    const { data } = await apiClient.get('/organizations/admin/users');
    return data;
  }

  async updateUserRole(_organizationId: string, userId: string, role: 'admin' | 'pm' | 'viewer' | 'member') {
    // Use normalizePlatformRole to handle all legacy role mappings consistently
    const normalizedRole = normalizePlatformRole(role);
    // Backend expects lowercase: 'admin', 'member', 'viewer'
    const backendRole = normalizedRole.toLowerCase();
    const { data } = await apiClient.patch(
      `/admin/users/${userId}/role`,
      { role: backendRole }
    );
    return data;
  }

  async removeUser(organizationId: string, userId: string) {
    const { data } = await apiClient.delete(
      `/organizations/${organizationId}/users/${userId}`
    );
    return data;
  }

  async bulkUpdateUserRoles(organizationId: string, updates: Array<{ userId: string; role: 'admin' | 'pm' | 'viewer' }>) {
    // Execute bulk updates
    const results = await Promise.allSettled(
      updates.map(update =>
        this.updateUserRole(organizationId, update.userId, update.role)
      )
    );
    return results;
  }

  async bulkRemoveUsers(organizationId: string, userIds: string[]) {
    const results = await Promise.allSettled(
      userIds.map(userId => this.removeUser(organizationId, userId))
    );
    return results;
  }

  async getRoles() {
    const { data } = await apiClient.get('/admin/organization/roles');
    return data;
  }

  async createRole(role: { name: string; description: string; permissions: string[] }) {
    const { data } = await apiClient.post('/admin/organization/roles', role);
    return data;
  }

  /**
   * PROMPT 9: Admin invite with workspace assignments
   */
  async inviteUsers(invite: {
    emails: string[];
    platformRole: 'Member' | 'Guest';
    workspaceAssignments?: Array<{ workspaceId: string; accessLevel: 'Member' | 'Guest' }>;
  }) {
    const { data } = await apiClient.post<{ data: { results: Array<{ email: string; status: 'success' | 'error'; message?: string }> } }>(
      '/admin/organization/users/invite',
      invite
    );
    return data;
  }

  // ==================== Templates ====================
  async getTemplates() {
    const { data } = await apiClient.get('/api/templates');
    return data;
  }

  async deleteTemplate(templateId: string) {
    const { data } = await apiClient.delete(`/api/templates/${templateId}`);
    return data;
  }

  async setDefaultTemplate(templateId: string) {
    const { data } = await apiClient.post(`/api/templates/${templateId}/set-default`);
    return data;
  }

  // ==================== Workspaces ====================
  async getWorkspaces(params?: { search?: string; status?: string }) {
    const response = await apiClient.get('/admin/workspaces', { params });
    // Backend returns { data: Workspace[] }
    return unwrapArray(response);
  }

  async updateWorkspace(workspaceId: string, updates: { ownerId?: string; visibility?: 'public' | 'private'; status?: 'active' | 'archived' }) {
    const { data } = await apiClient.patch(`/admin/workspaces/${workspaceId}`, updates);
    return data;
  }

  async deleteWorkspace(workspaceId: string) {
    const { data } = await apiClient.delete(`/api/workspaces/${workspaceId}`);
    return data;
  }

  async archiveWorkspace(workspaceId: string) {
    const { data } = await apiClient.patch(`/api/workspaces/${workspaceId}/archive`);
    return data;
  }

  // ==================== Projects ====================
  async getProjects(params?: { search?: string; status?: string; workspaceId?: string }) {
    const response = await apiClient.get('/api/projects', { params });
    // Backend returns { data: { projects, total, page, totalPages } }
    const data = unwrapData<{ projects?: any[]; total: number; page: number; totalPages: number }>(response);
    return data || { projects: [], total: 0, page: 1, totalPages: 0 };
  }

  async deleteProject(projectId: string) {
    const { data } = await apiClient.delete(`/api/projects/${projectId}`);
    return data;
  }

  async archiveProject(projectId: string) {
    const { data } = await apiClient.patch(`/api/projects/${projectId}/archive`);
    return data;
  }

  // ==================== Audit Logs ====================
  async getAuditLogs(params?: { page?: number; limit?: number; action?: string; userId?: string }) {
    const { data } = await apiClient.get('/admin/audit', { params });
    return data;
  }

  async createAuditLog(log: {
    action: string;
    entityType: string;
    entityId?: string;
    details?: any;
  }) {
    const { data } = await apiClient.post('/admin/audit', log);
    return data;
  }
}

export const adminApi = new AdminApiService();
