import { 
  WorkflowTemplate, 
  WorkflowInstance, 
  IntakeForm, 
  IntakeSubmission,
  CreateWorkflowTemplateRequest,
  UpdateWorkflowTemplateRequest,
  CloneWorkflowTemplateRequest,
  CreateWorkflowInstanceRequest,
  WorkflowActionRequest
} from '../types/workflow';
import { api } from '@/lib/api';

class WorkflowTemplateService {
  private async get<T>(endpoint: string): Promise<T> {
    return api.get(endpoint);
  }

  private async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return api.post(endpoint, data);
  }

  private async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return api.patch(endpoint, data);
  }

  private async del<T>(endpoint: string): Promise<T> {
    return api.delete(endpoint);
  }

  // Workflow Templates
  async getAll(params?: {
    search?: string;
    type?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: WorkflowTemplate[]; meta: unknown }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    return this.get(`/api/pm/workflow-templates?${queryParams}`);
  }

  async getById(id: string): Promise<WorkflowTemplate> {
    return this.get(`/api/pm/workflow-templates/${id}`);
  }

  async create(data: CreateWorkflowTemplateRequest): Promise<WorkflowTemplate> {
    return this.post(`/api/pm/workflow-templates`, data);
  }

  async update(id: string, data: UpdateWorkflowTemplateRequest): Promise<WorkflowTemplate> {
    return this.patch(`/api/pm/workflow-templates/${id}`, data);
  }

  async clone(id: string, data: CloneWorkflowTemplateRequest): Promise<WorkflowTemplate> {
    return this.post(`/api/pm/workflow-templates/${id}/clone`, data);
  }

  async activate(id: string): Promise<WorkflowTemplate> {
    return this.post(`/api/pm/workflow-templates/${id}/activate`);
  }

  async deactivate(id: string): Promise<WorkflowTemplate> {
    return this.post(`/api/pm/workflow-templates/${id}/deactivate`);
  }

  async delete(id: string): Promise<void> {
    return this.del(`/api/pm/workflow-templates/${id}`);
  }

  async getDefaults(): Promise<WorkflowTemplate[]> {
    return this.get('/api/pm/workflow-templates/defaults');
  }

  // Workflow Instances
  async createInstance(data: CreateWorkflowInstanceRequest): Promise<WorkflowInstance> {
    return this.post(`/api/pm/workflow-templates/${data.templateId}/instances`, data);
  }

  async getInstances(params?: {
    search?: string;
    status?: string;
    templateId?: string;
    assignedTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: WorkflowInstance[]; meta: unknown }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    return this.get(`/api/pm/workflow-instances?${queryParams}`);
  }

  async getInstanceById(id: string): Promise<WorkflowInstance> {
    return this.get(`/api/pm/workflow-instances/${id}`);
  }

  async updateInstance(id: string, data: Partial<WorkflowInstance>): Promise<WorkflowInstance> {
    return this.patch(`/api/pm/workflow-instances/${id}`, data);
  }

  async executeAction(id: string, action: WorkflowActionRequest): Promise<WorkflowInstance> {
    return this.post(`/api/pm/workflow-instances/${id}/actions`, action);
  }

  async getInstanceHistory(id: string): Promise<{
    instanceId: string;
    currentStage: string;
    stageHistory: unknown[];
    approvals: unknown[];
    metrics: unknown;
    totalDuration: number | null;
  }> {
    return this.get(`/api/pm/workflow-instances/${id}/history`);
  }

  async getInstanceMetrics(id: string): Promise<{
    instanceId: string;
    status: string;
    currentStage: string;
    stageMetrics: unknown;
    totalDuration: number | null;
    pendingApprovals: number;
    canProgress: boolean;
  }> {
    return this.get(`/api/pm/workflow-instances/${id}/metrics`);
  }
}

class IntakeFormService {
  private async get<T>(endpoint: string): Promise<T> {
    return api.get(endpoint);
  }

  private async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return api.post(endpoint, data);
  }

  private async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return api.patch(endpoint, data);
  }

  private async del<T>(endpoint: string): Promise<T> {
    return api.delete(endpoint);
  }

  // Intake Forms Management
  async getForms(): Promise<IntakeForm[]> {
    return this.get('/api/pm/intake/forms');
  }

  async getFormById(id: string): Promise<IntakeForm> {
    return this.get(`/api/pm/intake/forms/${id}`);
  }

  async createForm(data: Partial<IntakeForm>): Promise<IntakeForm> {
    return this.post('/api/pm/intake/forms', data);
  }

  async updateForm(id: string, data: Partial<IntakeForm>): Promise<IntakeForm> {
    return this.patch(`/api/pm/intake/forms/${id}`, data);
  }

  async deleteForm(id: string): Promise<void> {
    return this.del(`/api/pm/intake/forms/${id}`);
  }

  // Public Form Access (no auth required)
  async getPublicForm(slug: string): Promise<IntakeForm> {
    return this.get(`/api/intake/${slug}`);
  }

  async submitIntake(slug: string, data: unknown): Promise<{
    id: string;
    title: string;
    status: string;
    submittedAt: Date;
    confirmationMessage: string;
  }> {
    return this.post(`/api/intake/${slug}/submit`, data);
  }

  // Submissions Management
  async getSubmissions(params?: {
    search?: string;
    status?: string;
    priority?: string;
    formId?: string;
    assignedTo?: string;
    page?: number;
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ data: IntakeSubmission[]; meta: unknown }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    return this.get(`/api/pm/intake/submissions?${queryParams}`);
  }

  async getSubmissionById(id: string): Promise<IntakeSubmission> {
    return this.get(`/api/pm/intake/submissions/${id}`);
  }

  async processSubmission(id: string, data: {
    assignTo?: string;
    notes?: string;
    createProject?: boolean;
    workflowTemplateId?: string;
    projectTitle?: string;
    projectDescription?: string;
  }): Promise<IntakeSubmission> {
    return this.post(`/api/pm/intake/submissions/${id}/process`, data);
  }

  async bulkAction(data: {
    submissionIds: string[];
    action: 'assign' | 'process' | 'reject' | 'delete' | 'change_priority';
    assignTo?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    notes?: string;
  }): Promise<{ success: number; failed: number; errors: string[] }> {
    return this.post('/api/pm/intake/submissions/bulk-action', data);
  }

  async getFormAnalytics(formId: string): Promise<{
    formId: string;
    formName: string;
    totalViews: number;
    totalSubmissions: number;
    conversionRate: number;
    submissionsByStatus: Record<string, number>;
    submissionsByPriority: Record<string, number>;
    averageCompletionTime: number | null;
    peakSubmissionHours: Record<string, number>;
  }> {
    return this.get(`/api/pm/intake/forms/${formId}/analytics`);
  }
}

// Create service instances
export const workflowTemplateService = new WorkflowTemplateService();
export const intakeFormService = new IntakeFormService();

// Export services as default for convenience
export default {
  templates: workflowTemplateService,
  intake: intakeFormService,
};
