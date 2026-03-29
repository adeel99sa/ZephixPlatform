/**
 * Phase 7: Projects API client
 * Typed API client for all project-related endpoints
 */

import type { Project } from './types';
import type { ProjectTemplateBinding, TemplateDeltaReview } from './template-binding.types';
import {
  listTemplateDeltaReviews as fetchTemplateDeltaReviews,
  patchProject as patchProjectRequest,
  restoreProject as restoreProjectRequest,
} from './api';
import {
  ProjectGovernanceLevel,
  ProjectStatus,
  ProjectPriority,
  ProjectRiskLevel,
} from './types';

import { api } from '@/lib/api';

export interface ProjectSummary {
  id: string;
  name: string;
  workspaceId: string;
  methodology: string;
  status: ProjectStatus;
  /** HEALTHY | AT_RISK | BLOCKED | … when provided by API */
  health?: string;
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
  /** v5: When set, drives Prompt 9 out-of-sync banner + review flow. */
  templateBinding?: ProjectTemplateBinding | null;
  /** Progressive shell tabs (normalized on backend). */
  activeTabs?: string[];
  governanceLevel?: ProjectGovernanceLevel;
  definitionOfDone?: string[];
  projectManagerId?: string | null;
  deliveryOwnerUserId?: string | null;
  // Budget & Cost Lite
  budget?: number;
  actualCost?: number;
  currency?: string;
  flatLaborRatePerHour?: number;
  costTrackingEnabled?: boolean;
  // Template Enforcement
  iterationsEnabled?: boolean;
  estimationMode?: 'points_only' | 'hours_only' | 'both';
  defaultIterationLengthDays?: number;
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

export interface ProjectSharePayload {
  userId: string;
  accessLevel?: 'project_manager' | 'delivery_owner';
}

export interface ProjectAssignment {
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

export interface CreateProjectAssignmentPayload {
  userId: string;
  allocationPercent?: number;
  startDate?: string;
  endDate?: string;
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
    try {
      // api.ts response interceptor already unwraps { data: T } envelope,
      // so the resolved value IS the project object directly.
      const result = await api.get(`/projects/${id}`);
      return (result as unknown as ProjectDetail) ?? null;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
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

  async shareProject(
    projectId: string,
    payload: ProjectSharePayload,
  ): Promise<ProjectDetail> {
    const result: any = await api.post(`/projects/${projectId}/share`, payload);
    return result?.data ?? result;
  },

  async unshareProject(projectId: string, userId: string): Promise<ProjectDetail> {
    const result: any = await api.delete(`/projects/${projectId}/share/${userId}`);
    return result?.data ?? result;
  },

  async listProjectAssignments(
    projectId: string,
  ): Promise<{ items: ProjectAssignment[]; total: number }> {
    const result: any = await api.get(`/work/resources/allocations`, {
      params: { projectId },
    });
    const payload = result?.items ? result : (result?.data ?? result);
    return {
      items: Array.isArray(payload?.items) ? payload.items : [],
      total: typeof payload?.total === 'number' ? payload.total : 0,
    };
  },

  async addProjectAssignment(
    projectId: string,
    payload: CreateProjectAssignmentPayload,
  ): Promise<ProjectAssignment> {
    const result: any = await api.post('/work/resources/allocations', {
      projectId,
      ...payload,
    });
    return result?.data ?? result;
  },

  async removeProjectAssignment(allocationId: string): Promise<void> {
    await api.delete(`/work/resources/allocations/${allocationId}`);
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

  /** Prompt 10: Restore soft-deleted project */
  async restoreProject(id: string): Promise<Project> {
    return restoreProjectRequest(id);
  },

  /** Progressive shell (6b): PATCH project fields such as `activeTabs`. */
  async patchProject(
    id: string,
    payload: { activeTabs?: string[] },
  ): Promise<ProjectDetail> {
    return patchProjectRequest(id, payload);
  },

  /** v5 Prompt 9: Pending (default) or filtered template delta reviews. */
  async listTemplateDeltaReviews(
    projectId: string,
    params?: { status?: string },
  ): Promise<TemplateDeltaReview[]> {
    return fetchTemplateDeltaReviews(projectId, params);
  },
};

