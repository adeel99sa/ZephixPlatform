/**
 * Phase 7: Projects API client
 * Typed API client for all project-related endpoints
 */

import { api } from '@/lib/api';
import { ProjectStatus, ProjectPriority, ProjectRiskLevel } from './types';

export interface ProjectSummary {
  id: string;
  name: string;
  workspaceId: string;
  methodology: string;
  status: ProjectStatus;
  ownerId?: string;
  phasesCount: number;
  tasksCount: number;
  risksCount: number;
  kpisCount: number;
  startDate?: string;
  endDate?: string;
  estimatedEndDate?: string;
  progress: number;
  riskScore: number;
  priority: ProjectPriority;
  riskLevel: ProjectRiskLevel;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends ProjectSummary {
  definitionOfDone?: string[];
}

export interface Task {
  id: string;
  projectId: string;
  taskNumber: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignedTo?: string;
  assignee?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  estimatedHours: number;
  actualHours: number;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Risk {
  id: string;
  projectId: string;
  organizationId: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  detectedAt: string;
  source?: string;
  evidence?: any;
  mitigation?: any;
  createdAt: string;
  updatedAt: string;
}

export interface KPI {
  id: string;
  projectId: string;
  metricDate: string;
  metricType: string;
  metricCategory: string;
  metricValue: number;
  metricUnit?: string;
  metricMetadata?: {
    source: string;
    confidence: number;
    trend: 'improving' | 'stable' | 'deteriorating';
    benchmark?: number;
    target?: number;
    direction?: 'higher_is_better' | 'lower_is_better';
    additionalData?: any;
  };
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface UpdateProjectSettingsDto {
  name?: string;
  description?: string;
  projectManagerId?: string;
  startDate?: string;
  endDate?: string;
  estimatedEndDate?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  definitionOfDone?: string[];
}

/**
 * Projects API Service
 */
export const projectsApi = {
  /**
   * Get all projects (optionally filtered by workspace)
   */
  async getProjects(params?: {
    workspaceId?: string;
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{ projects: ProjectDetail[]; total: number; page: number; totalPages: number }> {
    // api.ts response interceptor already unwraps { data: T } envelope
    const result: any = await api.get('/projects', { params });
    // Handle both unwrapped and raw shapes defensively
    const payload = result?.projects ? result : (result?.data ?? result);
    return payload?.projects
      ? payload
      : { projects: Array.isArray(payload) ? payload : [], total: 0, page: 1, totalPages: 0 };
  },

  /**
   * Get a single project by ID
   */
  async getProject(id: string): Promise<ProjectDetail | null> {
    // api.ts response interceptor already unwraps { data: T } envelope,
    // so the resolved value IS the project object directly.
    const result = await api.get(`/projects/${id}`);
    return (result as unknown as ProjectDetail) ?? null;
  },

  /**
   * Get project summary with counts
   */
  async getProjectSummary(id: string): Promise<ProjectSummary> {
    // api.ts interceptor already unwraps { data: T }
    const result: any = await api.get(`/projects/${id}/summary`);
    return result?.data ?? result;
  },

  /**
   * Get project tasks
   * PART 1 Step 2: Use /work/tasks endpoint with projectId query param
   */
  async getProjectTasks(id: string): Promise<Task[]> {
    // api.ts interceptor already unwraps { data: T }
    const result: any = await api.get(`/work/tasks?projectId=${id}`);
    return Array.isArray(result) ? result : (result?.data ?? result ?? []);
  },

  /**
   * Get project risks
   */
  async getProjectRisks(id: string): Promise<Risk[]> {
    // api.ts interceptor already unwraps { data: T }
    const result: any = await api.get(`/projects/${id}/risks`);
    return Array.isArray(result) ? result : (result?.data ?? result ?? []);
  },

  /**
   * Get project KPIs (legacy - returns KPI metrics)
   */
  async getProjectKPIs(id: string): Promise<KPI[]> {
    // api.ts interceptor already unwraps { data: T }
    const result: any = await api.get(`/projects/${id}/kpis`);
    return Array.isArray(result) ? result : (result?.data ?? result ?? []);
  },

  /**
   * Get project KPI settings (available KPIs and active KPI IDs)
   */
  async getProjectKpiSettings(id: string): Promise<{
    availableKPIs: Array<{
      id: string;
      name: string;
      description?: string;
      type?: string;
      calculationMethod?: string;
      unit?: string;
      [key: string]: any;
    }>;
    activeKpiIds: string[];
  }> {
    // api.ts interceptor already unwraps { data: T }
    const result: any = await api.get(`/projects/${id}/kpis`);
    const data = result?.availableKPIs ? result : (result?.data ?? result);
    return {
      availableKPIs: data?.availableKPIs || [],
      activeKpiIds: data?.activeKpiIds || [],
    };
  },

  /**
   * Update project KPI activation state
   */
  async updateProjectKpiSettings(
    id: string,
    activeKpiIds: string[],
  ): Promise<{
    availableKPIs: Array<{
      id: string;
      name: string;
      [key: string]: any;
    }>;
    activeKpiIds: string[];
  }> {
    // api.ts interceptor already unwraps { data: T }
    const result: any = await api.patch(`/projects/${id}/kpis`, {
      activeKpiIds,
    });
    const data = result?.availableKPIs ? result : (result?.data ?? result);
    return {
      availableKPIs: data?.availableKPIs || [],
      activeKpiIds: data?.activeKpiIds || [],
    };
  },

  /**
   * Update project settings
   */
  async updateProjectSettings(
    id: string,
    settings: UpdateProjectSettingsDto,
  ): Promise<ProjectDetail> {
    // api.ts interceptor already unwraps { data: T }
    const result: any = await api.patch(`/projects/${id}/settings`, settings);
    return result?.data ?? result;
  },

  /**
   * Archive project
   */
  async archiveProject(id: string): Promise<ProjectDetail> {
    // api.ts interceptor already unwraps { data: T }
    const result: any = await api.post(`/projects/${id}/archive`);
    return result?.data ?? result;
  },

  /**
   * Delete project
   */
  async deleteProject(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  },
};

