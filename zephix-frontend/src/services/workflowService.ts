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

const API_BASE_URL = process.env.VITE_API_BASE_URL || '/api';

class WorkflowTemplateService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('accessToken');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Workflow Templates
  async getAll(params?: {
    search?: string;
    type?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: WorkflowTemplate[]; meta: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    return this.request(`/api/pm/workflow-templates?${queryParams}`);
  }

  async getById(id: string): Promise<WorkflowTemplate> {
    return this.request(`/api/pm/workflow-templates/${id}`);
  }

  async create(data: CreateWorkflowTemplateRequest): Promise<WorkflowTemplate> {
    return this.request(`/api/pm/workflow-templates`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async update(id: string, data: UpdateWorkflowTemplateRequest): Promise<WorkflowTemplate> {
    return this.request(`/api/pm/workflow-templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async clone(id: string, data: CloneWorkflowTemplateRequest): Promise<WorkflowTemplate> {
    return this.request(`/api/pm/workflow-templates/${id}/clone`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async activate(id: string): Promise<WorkflowTemplate> {
    return this.request(`/api/pm/workflow-templates/${id}/activate`, {
      method: 'POST',
    });
  }

  async deactivate(id: string): Promise<WorkflowTemplate> {
    return this.request(`/api/pm/workflow-templates/${id}/deactivate`, {
      method: 'POST',
    });
  }

  async delete(id: string): Promise<void> {
    return this.request(`/api/pm/workflow-templates/${id}`, {
      method: 'DELETE',
    });
  }

  async getDefaults(): Promise<WorkflowTemplate[]> {
    return this.request('/api/pm/workflow-templates/defaults');
  }

  // Workflow Instances
  async createInstance(data: CreateWorkflowInstanceRequest): Promise<WorkflowInstance> {
    return this.request(`/api/pm/workflow-templates/${data.templateId}/instances`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getInstances(params?: {
    search?: string;
    status?: string;
    templateId?: string;
    assignedTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: WorkflowInstance[]; meta: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    return this.request(`/api/pm/workflow-instances?${queryParams}`);
  }

  async getInstanceById(id: string): Promise<WorkflowInstance> {
    return this.request(`/api/pm/workflow-instances/${id}`);
  }

  async updateInstance(id: string, data: Partial<WorkflowInstance>): Promise<WorkflowInstance> {
    return this.request(`/api/pm/workflow-instances/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async executeAction(id: string, action: WorkflowActionRequest): Promise<WorkflowInstance> {
    return this.request(`/api/pm/workflow-instances/${id}/actions`, {
      method: 'POST',
      body: JSON.stringify(action),
    });
  }

  async getInstanceHistory(id: string): Promise<{
    instanceId: string;
    currentStage: string;
    stageHistory: any[];
    approvals: any[];
    metrics: any;
    totalDuration: number | null;
  }> {
    return this.request(`/api/pm/workflow-instances/${id}/history`);
  }

  async getInstanceMetrics(id: string): Promise<{
    instanceId: string;
    status: string;
    currentStage: string;
    stageMetrics: any;
    totalDuration: number | null;
    pendingApprovals: number;
    canProgress: boolean;
  }> {
    return this.request(`/api/pm/workflow-instances/${id}/metrics`);
  }
}

class IntakeFormService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('accessToken');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Intake Forms Management
  async getForms(): Promise<IntakeForm[]> {
    return this.request('/api/pm/intake/forms');
  }

  async getFormById(id: string): Promise<IntakeForm> {
    return this.request(`/api/pm/intake/forms/${id}`);
  }

  async createForm(data: Partial<IntakeForm>): Promise<IntakeForm> {
    return this.request('/api/pm/intake/forms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateForm(id: string, data: Partial<IntakeForm>): Promise<IntakeForm> {
    return this.request(`/api/pm/intake/forms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteForm(id: string): Promise<void> {
    return this.request(`/api/pm/intake/forms/${id}`, {
      method: 'DELETE',
    });
  }

  // Public Form Access (no auth required)
  async getPublicForm(slug: string): Promise<IntakeForm> {
    return this.request(`/api/intake/${slug}`);
  }

  async submitIntake(slug: string, data: any): Promise<{
    id: string;
    title: string;
    status: string;
    submittedAt: Date;
    confirmationMessage: string;
  }> {
    return this.request(`/api/intake/${slug}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
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
  }): Promise<{ data: IntakeSubmission[]; meta: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    return this.request(`/api/pm/intake/submissions?${queryParams}`);
  }

  async getSubmissionById(id: string): Promise<IntakeSubmission> {
    return this.request(`/api/pm/intake/submissions/${id}`);
  }

  async processSubmission(id: string, data: {
    assignTo?: string;
    notes?: string;
    createProject?: boolean;
    workflowTemplateId?: string;
    projectTitle?: string;
    projectDescription?: string;
  }): Promise<IntakeSubmission> {
    return this.request(`/api/pm/intake/submissions/${id}/process`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async bulkAction(data: {
    submissionIds: string[];
    action: 'assign' | 'process' | 'reject' | 'delete' | 'change_priority';
    assignTo?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    notes?: string;
  }): Promise<{ success: number; failed: number; errors: string[] }> {
    return this.request('/api/pm/intake/submissions/bulk-action', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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
    return this.request(`/api/pm/intake/forms/${formId}/analytics`);
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
