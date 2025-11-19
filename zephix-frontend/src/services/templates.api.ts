import { api } from '@/lib/api';

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
}

export interface UpdateTemplateDto extends Partial<CreateTemplateDto> {}

/**
 * Template API Service
 * Connects to Week 1 backend API
 */
export const templatesApi = {
  /**
   * List all templates
   */
  async getTemplates(scope?: 'organization' | 'team' | 'personal'): Promise<ProjectTemplate[]> {
    const params = scope ? { scope } : {};
    const response = await api.get('/api/templates', { params });
    return Array.isArray(response) ? response : response?.data || [];
  },

  /**
   * Get a single template by ID
   */
  async getTemplate(id: string): Promise<ProjectTemplate> {
    const response = await api.get(`/api/templates/${id}`);
    return response?.data || response;
  },

  /**
   * Create a new template
   */
  async createTemplate(data: CreateTemplateDto): Promise<ProjectTemplate> {
    const response = await api.post('/api/templates', data);
    return response?.data || response;
  },

  /**
   * Update an existing template
   */
  async updateTemplate(id: string, data: UpdateTemplateDto): Promise<ProjectTemplate> {
    const response = await api.put(`/api/templates/${id}`, data);
    return response?.data || response;
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
    return response?.data || response;
  },

  /**
   * Set a template as default
   */
  async setAsDefault(id: string): Promise<ProjectTemplate> {
    const response = await api.post(`/api/templates/${id}/set-default`);
    return response?.data || response;
  },
};


