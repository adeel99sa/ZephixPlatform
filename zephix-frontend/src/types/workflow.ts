// Workflow Framework Types

export interface WorkflowStage {
  id: string;
  name: string;
  type: 'intake_stage' | 'project_phase' | 'approval_gate' | 'orr_section';
  required: boolean;
  automations: Array<{
    trigger: string;
    action: string;
    conditions: Record<string, any>;
  }>;
  approvers: string[];
  notifications: Array<{
    event: string;
    recipients: string[];
    template: string;
  }>;
}

export interface WorkflowField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'file' | 'textarea' | 'checkbox' | 'url' | 'email';
  required: boolean;
  options?: string[];
  validation?: Record<string, any>;
  placeholder?: string;
  helpText?: string;
}

export interface WorkflowIntegration {
  type: 'webhook' | 'email' | 'api';
  endpoint: string;
  events: string[];
  payload_template: Record<string, any>;
  headers?: Record<string, string>;
}

export interface WorkflowConfiguration {
  stages: WorkflowStage[];
  fields: WorkflowField[];
  integrations: WorkflowIntegration[];
  settings: {
    allowParallelExecution: boolean;
    autoProgressOnApproval: boolean;
    requireAllApprovals: boolean;
    notifyOnStageChange: boolean;
  };
}

export interface WorkflowTemplate {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  type: 'intake' | 'project' | 'orr' | 'custom';
  configuration: WorkflowConfiguration;
  isActive: boolean;
  isDefault: boolean;
  isPublic: boolean;
  metadata: {
    version: string;
    createdBy: string;
    lastModifiedBy: string;
    tags: string[];
    category: string;
  };
  createdAt: Date;
  updatedAt: Date;
  instanceCount?: number;
}

export interface StageHistoryEntry {
  stageId: string;
  enteredAt: Date;
  exitedAt?: Date;
  actor: string;
  notes?: string;
  duration?: number;
}

export interface ApprovalEntry {
  stageId: string;
  approverId: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  timestamp: Date;
  remindersSent?: number;
}

export interface WorkflowInstance {
  id: string;
  organizationId: string;
  templateId: string;
  template?: WorkflowTemplate;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'cancelled' | 'on_hold' | 'failed';
  currentStage?: string;
  data: {
    formData: Record<string, any>;
    customFields: Record<string, any>;
    attachments: Array<{
      id: string;
      name: string;
      url: string;
      uploadedBy: string;
      uploadedAt: Date;
    }>;
    metrics?: {
      totalDuration?: number;
      stageMetrics?: Record<string, { duration: number; attempts: number }>;
    };
  };
  stageHistory: StageHistoryEntry[];
  approvals: ApprovalEntry[];
  assignedTo?: string;
  assignedUser?: any;
  createdBy: string;
  creator?: any;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata: {
    sourceType?: 'intake' | 'manual' | 'api';
    sourceId?: string;
    externalReferences?: Array<{
      type: string;
      id: string;
      url?: string;
    }>;
    labels?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// Intake Form Types
export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect' | 'file' | 'checkbox' | 'radio' | 'url' | 'email' | 'phone';
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  conditional?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  };
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: string[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface FormSchema {
  fields: FormField[];
  sections: FormSection[];
  layout: 'single_column' | 'two_column' | 'tabs';
  styling: {
    theme: 'default' | 'dark' | 'light' | 'custom';
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
  };
}

export interface FormSettings {
  requireLogin: boolean;
  allowAnonymous: boolean;
  confirmationMessage: string;
  redirectUrl?: string;
  emailNotifications: string[];
  autoAssign?: {
    enabled: boolean;
    assignTo: string;
    rules?: Array<{
      field: string;
      operator: string;
      value: any;
      assignTo: string;
    }>;
  };
  integrations?: {
    slackWebhook?: string;
    teamsWebhook?: string;
    customWebhooks?: Array<{
      name: string;
      url: string;
      headers?: Record<string, string>;
    }>;
  };
}

export interface IntakeForm {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  thankYouMessage?: string;
  formSchema: FormSchema;
  targetWorkflowId?: string;
  targetWorkflow?: WorkflowTemplate;
  isPublic: boolean;
  isActive: boolean;
  settings: FormSettings;
  analytics: {
    totalViews: number;
    totalSubmissions: number;
    conversionRate: number;
    lastSubmissionAt?: Date;
    popularFields?: Record<string, number>;
  };
  createdAt: Date;
  updatedAt: Date;
  submissionCount?: number;
}

export interface IntakeSubmission {
  id: string;
  organizationId: string;
  formId: string;
  form?: IntakeForm;
  title: string;
  description?: string;
  status: 'pending' | 'processing' | 'processed' | 'rejected' | 'cancelled';
  data: {
    formData: Record<string, any>;
    metadata: {
      userAgent?: string;
      ipAddress?: string;
      referrer?: string;
      submissionTime: Date;
      timeToComplete?: number;
    };
    attachments?: Array<{
      fieldId: string;
      files: Array<{
        id: string;
        name: string;
        size: number;
        type: string;
        url: string;
      }>;
    }>;
  };
  submitterName?: string;
  submitterEmail?: string;
  submitterPhone?: string;
  submittedBy?: string;
  submitter?: any;
  assignedTo?: string;
  assignedUser?: any;
  processedBy?: string;
  processor?: any;
  processedAt?: Date;
  processingNotes?: string;
  workflowInstanceId?: string;
  workflowInstance?: WorkflowInstance;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  dueDate?: Date;
  automationResults: {
    notifications?: Array<{
      type: string;
      recipient: string;
      status: 'sent' | 'failed';
      timestamp: Date;
      error?: string;
    }>;
    integrations?: Array<{
      type: string;
      endpoint: string;
      status: 'success' | 'failed';
      timestamp: Date;
      response?: any;
      error?: string;
    }>;
    assignments?: Array<{
      assignedTo: string;
      reason: string;
      timestamp: Date;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response Types
export interface CreateWorkflowTemplateRequest {
  name: string;
  description?: string;
  type: 'intake' | 'project' | 'orr' | 'custom';
  configuration: WorkflowConfiguration;
  isActive?: boolean;
  isDefault?: boolean;
  isPublic?: boolean;
  metadata?: {
    version?: string;
    tags?: string[];
    category?: string;
  };
}

export interface UpdateWorkflowTemplateRequest {
  name?: string;
  description?: string;
  configuration?: WorkflowConfiguration;
  isActive?: boolean;
  isDefault?: boolean;
  isPublic?: boolean;
  metadata?: {
    version?: string;
    tags?: string[];
    category?: string;
  };
}

export interface CloneWorkflowTemplateRequest {
  name: string;
  description?: string;
  copyInstances?: boolean;
}

export interface CreateWorkflowInstanceRequest {
  templateId: string;
  title: string;
  description?: string;
  data?: Record<string, any>;
  assignedTo?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: {
    sourceType?: 'intake' | 'manual' | 'api';
    sourceId?: string;
    labels?: string[];
  };
}

export interface WorkflowActionRequest {
  action: 'approve' | 'reject' | 'move_to_stage' | 'assign';
  targetStageId?: string;
  assignTo?: string;
  comments?: string;
}

// UI Component Props Types
export interface StageNodeProps {
  stage: WorkflowStage;
  isActive?: boolean;
  isCompleted?: boolean;
  onClick?: (stage: WorkflowStage) => void;
  onEdit?: (stage: WorkflowStage) => void;
  onDelete?: (stageId: string) => void;
}

export interface WorkflowCanvasProps {
  template: WorkflowTemplate | null;
  onStageClick?: (stage: WorkflowStage) => void;
  onStageUpdate?: (stage: WorkflowStage) => void;
  onStageAdd?: (stage: Partial<WorkflowStage>) => void;
  onStageDelete?: (stageId: string) => void;
  readonly?: boolean;
}

export interface StageEditorProps {
  stage: WorkflowStage | null;
  onUpdate: (stage: WorkflowStage) => void;
  onClose: () => void;
  availableUsers?: Array<{ id: string; name: string; email: string }>;
}

export interface FormBuilderProps {
  form: IntakeForm | null;
  onUpdate: (form: Partial<IntakeForm>) => void;
  readonly?: boolean;
}

export interface FormPreviewProps {
  form: IntakeForm;
  testMode?: boolean;
}

export interface IntakeFormRendererProps {
  form: IntakeForm;
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  onSubmit: (values: Record<string, any>) => void;
  readonly?: boolean;
}

// Constants
export const WORKFLOW_STAGE_TYPES = {
  intake_stage: 'Intake Stage',
  project_phase: 'Project Phase',
  approval_gate: 'Approval Gate',
  orr_section: 'ORR Section',
} as const;

export const WORKFLOW_TEMPLATE_TYPES = {
  intake: 'Intake Process',
  project: 'Project Workflow',
  orr: 'ORR Template',
  custom: 'Custom Workflow',
} as const;

export const FORM_FIELD_TYPES = {
  text: 'Text Input',
  textarea: 'Text Area',
  number: 'Number',
  date: 'Date',
  select: 'Select Dropdown',
  multiselect: 'Multi-Select',
  file: 'File Upload',
  checkbox: 'Checkbox',
  radio: 'Radio Button',
  url: 'URL',
  email: 'Email',
  phone: 'Phone Number',
} as const;

export const WORKFLOW_STATUS_COLORS = {
  active: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  on_hold: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
} as const;

export const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
  urgent: 'bg-red-100 text-red-800',
} as const;
