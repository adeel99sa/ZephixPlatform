import api from './api';

export interface ProjectKPIs {
  tasksTotal: number;
  tasksCompleted: number;
  tasksOverdue: number;
  completionPercentage: number;
  resourceUtilization: number;
  budgetUsed: number;
  riskScore: number;
  healthStatus: 'on-track' | 'at-risk' | 'off-track';
}

export interface WorkspaceKPIs {
  workspaceId: string;
  workspaceName: string;
  totalProjects: number;
  projectsOnTrack: number;
  projectsAtRisk: number;
  projectsOffTrack: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionPercentage: number;
  overallResourceUtilization: number;
  totalBudget: number;
  budgetConsumed: number;
  criticalRisks: number;
  healthStatus: 'on-track' | 'at-risk' | 'off-track';
}

export interface ExecutiveKPIs {
  organizationId: string;
  totalProjects: number;
  projectsOnTrack: number;
  projectsAtRisk: number;
  projectsOffTrack: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  overallCompletionPercentage: number;
  overallResourceUtilization: number;
  totalBudget: number;
  budgetConsumed: number;
  criticalRisks: number;
  byWorkspace: WorkspaceKPIs[];
  directProjects: ProjectKPIs[];
  lastUpdated: string;
}

class KPIService {
  /**
   * Get executive KPIs for the organization
   */
  async getExecutiveKPIs(organizationId: string): Promise<ExecutiveKPIs> {
    const response = await api.get(`/kpi/executive/${organizationId}`);
    return response.data;
  }

  /**
   * Get workspace KPIs
   */
  async getWorkspaceKPIs(workspaceId: string): Promise<WorkspaceKPIs> {
    const response = await api.get(`/kpi/workspace/${workspaceId}`);
    return response.data;
  }

  /**
   * Get project KPIs
   */
  async getProjectKPIs(projectId: string): Promise<ProjectKPIs> {
    const response = await api.get(`/kpi/project/${projectId}`);
    return response.data;
  }

  /**
   * Force recalculation of project KPIs
   */
  async recalculateProjectKPIs(projectId: string): Promise<{ message: string; kpis: ProjectKPIs }> {
    const response = await api.post(`/kpi/recalculate/${projectId}`);
    return response.data;
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    byEntityType: Record<string, number>;
  }> {
    const response = await api.get('/kpi/cache/stats');
    return response.data;
  }

  /**
   * Clean up expired cache
   */
  async cleanupCache(): Promise<{ message: string }> {
    const response = await api.post('/kpi/cache/cleanup');
    return response.data;
  }

  /**
   * Subscribe to real-time KPI updates via WebSocket
   */
  subscribeToUpdates(organizationId: string, onUpdate: (data: any) => void): () => void {
    // Note: This would require socket.io-client to be installed
    // For now, we'll implement polling as a fallback
    console.warn('WebSocket subscription not implemented, using polling fallback');
    
    const interval = setInterval(async () => {
      try {
        const kpis = await this.getExecutiveKPIs(organizationId);
        onUpdate({ type: 'executive.updated', data: { kpis } });
      } catch (error) {
        console.error('Error polling KPI updates:', error);
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }
}

export default new KPIService();
















