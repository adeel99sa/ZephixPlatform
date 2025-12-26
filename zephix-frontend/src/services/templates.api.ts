import { api } from '@/lib/api';
import { unwrapData, unwrapArray } from '@/lib/api/unwrapData';

// Phase 5: Risk preset type
export interface RiskPreset {
  id: string; // Template local id
  title: string;
  description?: string;
  category?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability?: number; // 0-100
  ownerRoleHint?: string;
  tags?: string[];
}

// Phase 5: KPI preset type
export interface KpiPreset {
  id: string; // Template local id
  name: string;
  description?: string;
  metricType: string;
  unit: string;
  targetValue?: number | string;
  direction: 'higher_is_better' | 'lower_is_better';
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  methodology: 'agile' | 'waterfall' | 'kanban' | 'hybrid' | 'custom';
  phases: Array<{
    name: string;
    description: string;
    order: number;
    estimatedDurationDays: number;
  }>;
  taskTemplates: Array<{
    name: string;
    description?: string;
    estimatedHours: number;
    phaseOrder: number;
    assigneeRole?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }>;
  availableKPIs: Array<{
    id: string;
    name: string;
    description?: string;
    methodology: string;
    calculationMethod?: string;
    unit?: string;
  }>;
  defaultEnabledKPIs: string[];
  scope: 'organization' | 'team' | 'personal';
  teamId?: string;
  organizationId: string;
  createdById: string;
  isDefault: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  // Phase 5: Risk and KPI presets
  riskPresets?: RiskPreset[];
  kpiPresets?: KpiPreset[];
}

export interface CreateTemplateDto {
  name: string;
  description?: string;
  methodology: 'agile' | 'waterfall' | 'kanban' | 'hybrid' | 'custom';
  phases?: Array<{
    name: string;
    description?: string;
    order: number;
    estimatedDurationDays: number;
  }>;
  taskTemplates?: Array<{
    name: string;
    description?: string;
    estimatedHours: number;
    phaseOrder: number;
    assigneeRole?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }>;
  availableKPIs?: Array<{
    id: string;
    name: string;
    description?: string;
    methodology: string;
    calculationMethod?: string;
    unit?: string;
  }>;
  defaultEnabledKPIs?: string[];
  scope?: 'organization' | 'team' | 'personal';
  teamId?: string;
  isDefault?: boolean;
  // Phase 5: Risk and KPI presets
  riskPresets?: RiskPreset[];
  kpiPresets?: KpiPreset[];
}

export interface UpdateTemplateDto extends Partial<CreateTemplateDto> {}

/**
 * Template API Service
 * Connects to Week 1 backend API
 */
export const templatesApi = {
  /**
   * List all templates
   * Phase 4: Extended with filters
   */
  async getTemplates(filters?: {
    scope?: 'organization' | 'team' | 'personal';
    category?: string;
    kind?: 'project' | 'board' | 'mixed';
    search?: string;
    isActive?: boolean;
    methodology?: string;
  }): Promise<ProjectTemplate[]> {
    const params: any = {};
    if (filters?.scope) params.scope = filters.scope;
    if (filters?.category) params.category = filters.category;
    if (filters?.kind) params.kind = filters.kind;
    if (filters?.search) params.search = filters.search;
    if (filters?.isActive !== undefined) params.isActive = filters.isActive.toString();
    if (filters?.methodology) params.methodology = filters.methodology;

    const response = await api.get('/api/templates', { params });
    // Backend returns { data: Template[] }
    return unwrapArray<ProjectTemplate>(response);
  },

  /**
   * Get a single template by ID
   */
  async getTemplate(id: string): Promise<ProjectTemplate | null> {
    const response = await api.get(`/api/templates/${id}`);
    // Backend returns { data: TemplateDetail | null }
    return unwrapData<ProjectTemplate>(response);
  },

  /**
   * Create a new template
   */
  async createTemplate(data: CreateTemplateDto): Promise<ProjectTemplate> {
    const response = await api.post('/api/templates', data);
    return unwrapData<ProjectTemplate>(response) || {} as ProjectTemplate;
  },

  /**
   * Update an existing template
   */
  async updateTemplate(id: string, data: UpdateTemplateDto): Promise<ProjectTemplate> {
    const response = await api.patch(`/api/templates/${id}`, data);
    return unwrapData<ProjectTemplate>(response) || {} as ProjectTemplate;
  },

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<void> {
    await api.delete(`/api/templates/${id}`);
  },

  /**
   * Clone a template
   */
  async cloneTemplate(id: string): Promise<ProjectTemplate> {
    const response = await api.post(`/api/templates/${id}/clone`);
    return unwrapData<ProjectTemplate>(response) || {} as ProjectTemplate;
  },

  /**
   * Set a template as default
   */
  async setAsDefault(id: string): Promise<ProjectTemplate> {
    const response = await api.post(`/api/templates/${id}/set-default`);
    return unwrapData<ProjectTemplate>(response) || {} as ProjectTemplate;
  },

  /**
   * Phase 4: Instantiate a template to create a project
   */
  async instantiate(
    templateId: string,
    payload: {
      workspaceId: string;
      projectName: string;
      startDate?: string;
      endDate?: string;
      ownerId?: string;
    },
  ): Promise<{ projectId: string; name: string; workspaceId: string }> {
    const response = await api.post(`/api/templates/${templateId}/instantiate`, payload);
    // Backend returns { data: { projectId, name, workspaceId } }
    const data = unwrapData<{ projectId?: string; id?: string; name: string; workspaceId: string }>(response);
    if (!data) {
      throw new Error('Failed to instantiate template');
    }
    // Map projectId if response uses 'id' field
    if (data.id && !data.projectId) {
      return { projectId: data.id, name: data.name, workspaceId: data.workspaceId };
    }
    return data as { projectId: string; name: string; workspaceId: string };
  },
};



