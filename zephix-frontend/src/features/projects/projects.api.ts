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
  // Additional detail fields can be added here
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
    const response = await api.get<{ data: { projects: ProjectDetail[]; total: number; page: number; totalPages: number } }>('/projects', { params });
    // Backend returns { data: { projects, total, page, totalPages } }, extract data field
    return response?.data?.data || response?.data || { projects: [], total: 0, page: 1, totalPages: 0 };
  },

  /**
   * Get a single project by ID
   */
  async getProject(id: string): Promise<ProjectDetail | null> {
    const response = await api.get<{ data: ProjectDetail | null }>(`/projects/${id}`);
    // Backend returns { data: ProjectDetail | null }, extract data field
    return response?.data?.data !== undefined ? response.data.data : response?.data || null;
  },

  /**
   * Get project summary with counts
   */
  async getProjectSummary(id: string): Promise<ProjectSummary> {
    const response = await api.get(`/projects/${id}/summary`);
    return response.data;
  },

  /**
   * Get project tasks
   */
  async getProjectTasks(id: string): Promise<Task[]> {
    const response = await api.get(`/projects/${id}/tasks`);
    return response.data;
  },

  /**
   * Get project risks
   */
  async getProjectRisks(id: string): Promise<Risk[]> {
    const response = await api.get(`/projects/${id}/risks`);
    return response.data;
  },

  /**
   * Get project KPIs
   */
  async getProjectKPIs(id: string): Promise<KPI[]> {
    const response = await api.get(`/projects/${id}/kpis`);
    return response.data;
  },

  /**
   * Update project settings
   */
  async updateProjectSettings(
    id: string,
    settings: UpdateProjectSettingsDto,
  ): Promise<ProjectDetail> {
    const response = await api.patch(`/projects/${id}/settings`, settings);
    return response.data;
  },

  /**
   * Archive project
   */
  async archiveProject(id: string): Promise<ProjectDetail> {
    const response = await api.post(`/projects/${id}/archive`);
    return response.data;
  },

  /**
   * Delete project
   */
  async deleteProject(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  },
};

