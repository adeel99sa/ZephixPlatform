/**
 * Template Center UI - API Client
 * Wrappers for template CRUD operations with proper workspace scoping
 */

import api from '../../services/api';
import { getActiveWorkspaceId } from '../../utils/workspace';

// Types
export type TemplateScope = 'SYSTEM' | 'ORG' | 'WORKSPACE';

export interface TaskDto {
  title: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
  sortOrder?: number;
  description?: string;
}

export interface PhaseDto {
  name: string;
  reportingKey?: string;
  sortOrder: number;
  tasks: TaskDto[];
  isMilestone?: boolean;
  dueDate?: string;
}

export interface TemplateStructureDto {
  phases: PhaseDto[];
}

export interface TemplateDto {
  id: string;
  name: string;
  description?: string;
  category?: string;
  kind: 'project' | 'board' | 'mixed';
  icon?: string;
  templateScope: TemplateScope;
  workspaceId?: string;
  isDefault: boolean;
  isSystem: boolean;
  isActive: boolean;
  lockState: 'UNLOCKED' | 'LOCKED';
  version: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  methodology?: 'waterfall' | 'scrum' | 'agile' | 'kanban' | 'hybrid';
  structure?: TemplateStructureDto;
  defaultEnabledKPIs: string[];
  metadata?: Record<string, any>;
}

export interface CreateTemplateDto {
  name: string;
  description?: string;
  category?: string;
  kind?: 'project' | 'board' | 'mixed';
  icon?: string;
  templateScope: TemplateScope;
  methodology?: 'waterfall' | 'scrum' | 'agile' | 'kanban' | 'hybrid';
  structure?: TemplateStructureDto;
  defaultEnabledKPIs?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  methodology?: 'waterfall' | 'scrum' | 'agile' | 'kanban' | 'hybrid';
  structure?: TemplateStructureDto;
  defaultEnabledKPIs?: string[];
  metadata?: Record<string, any>;
}

export interface InstantiateTemplateDto {
  projectName: string;
}

export interface InstantiateTemplateResponse {
  projectId: string;
  projectName: string;
  state: string;
  structureLocked: boolean;
  phaseCount: number;
  taskCount: number;
}

/**
 * List templates
 * Includes x-workspace-id header if workspace is selected
 */
export async function listTemplates(): Promise<TemplateDto[]> {
  const workspaceId = getActiveWorkspaceId();
  
  const config: any = {};
  if (workspaceId) {
    config.headers = {
      'x-workspace-id': workspaceId,
    };
  }

  const response = await api.get<{ data: TemplateDto[] }>('/templates', config);
  return response.data?.data || response.data || [];
}

/**
 * Create template
 * Includes x-workspace-id header only for WORKSPACE scope
 */
export async function createTemplate(dto: CreateTemplateDto): Promise<TemplateDto> {
  const config: any = {};
  
  // Only include workspace header for WORKSPACE scope
  if (dto.templateScope === 'WORKSPACE') {
    const workspaceId = getActiveWorkspaceId();
    if (!workspaceId) {
      throw new Error('Workspace required for WORKSPACE templates');
    }
    config.headers = {
      'x-workspace-id': workspaceId,
    };
  }

  const response = await api.post<{ data: TemplateDto }>('/templates', dto, config);
  return response.data?.data || response.data;
}

/**
 * Update template
 * Includes x-workspace-id header only if templateScope is WORKSPACE
 * Note: We need to fetch the template first to know its scope, or pass it as parameter
 * For MVP, we'll include header if workspace is selected (backend will validate)
 */
export async function updateTemplate(
  templateId: string,
  dto: UpdateTemplateDto,
  templateScope?: TemplateScope
): Promise<TemplateDto> {
  const config: any = {};
  
  // Include workspace header only for WORKSPACE scope
  if (templateScope === 'WORKSPACE') {
    const workspaceId = getActiveWorkspaceId();
    if (workspaceId) {
      config.headers = {
        'x-workspace-id': workspaceId,
      };
    }
  }

  const response = await api.patch<{ data: TemplateDto }>(`/templates/${templateId}`, dto, config);
  return response.data?.data || response.data;
}

/**
 * Publish template
 * Includes x-workspace-id header only if templateScope is WORKSPACE
 */
export async function publishTemplate(
  templateId: string,
  templateScope?: TemplateScope
): Promise<TemplateDto> {
  const config: any = {};
  
  // Include workspace header only for WORKSPACE scope
  if (templateScope === 'WORKSPACE') {
    const workspaceId = getActiveWorkspaceId();
    if (workspaceId) {
      config.headers = {
        'x-workspace-id': workspaceId,
      };
    }
  }

  const response = await api.post<{ data: TemplateDto }>(`/templates/${templateId}/publish`, {}, config);
  return response.data?.data || response.data;
}

/**
 * Instantiate template
 * Requires workspace header
 */
export async function instantiateTemplate(
  templateId: string,
  dto: InstantiateTemplateDto
): Promise<InstantiateTemplateResponse> {
  const workspaceId = getActiveWorkspaceId();
  if (!workspaceId) {
    throw new Error('Workspace required for template instantiation');
  }

  const response = await api.post<{ data: InstantiateTemplateResponse }>(
    `/templates/${templateId}/instantiate-v5_1`,
    dto,
    {
      headers: {
        'x-workspace-id': workspaceId,
      },
    }
  );
  return response.data?.data || response.data;
}

/**
 * Get single template by ID
 */
export async function getTemplate(templateId: string): Promise<TemplateDto> {
  const response = await api.get<{ data: TemplateDto }>(`/templates/${templateId}`);
  return response.data?.data || response.data;
}
