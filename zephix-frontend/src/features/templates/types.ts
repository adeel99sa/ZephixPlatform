import type { TemplateWorkflow } from './types/TemplateWorkflow';

export type TemplateComplexity = 'low' | 'medium' | 'high';

/** Gallery / marketing tier — optional; map from {@link TemplateComplexity} when absent. */
export type TemplatePresentationTier = 'simple' | 'advanced' | 'enterprise';

export type TemplateStructureType =
  | 'lightweight'
  | 'phased'
  | 'milestone_capable';

export type TemplateView = 'list' | 'board' | 'gantt';

export type TemplateStatus =
  | 'BACKLOG'
  | 'TODO'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'IN_REVIEW'
  | 'DONE';

export interface TemplateImportOptions {
  includeViews: boolean;
  includeTasks: boolean;
  includePhases: boolean;
  includeMilestones: boolean;
  includeCustomFields: boolean;
  includeDependencies: boolean;
  remapDates: boolean;
}

export interface CanonicalTemplate {
  id: string;
  name: string;
  description: string;
  templateVersion: number;
  templateAuthor?: string;
  templateUpdatedAt?: string;
  category:
    | 'Start From Scratch'
    | 'Project Management'
    | 'Software Development'
    | 'Product Management'
    | 'Operations'
    | 'Manufacturing';
  complexity: TemplateComplexity;
  /**
   * Optional UI tier for unified Template Center (simple / advanced / enterprise).
   * When omitted, derive from {@link complexity} in category mapping.
   */
  presentationTier?: TemplatePresentationTier;
  /** Org-owned template vs system — when API provides it. */
  isCustom?: boolean;
  /** Instantiation + gate rules — when API provides it. */
  workflow?: TemplateWorkflow;
  includedViews: TemplateView[];
  includedFields: string[];
  includedStatuses: TemplateStatus[];
  structureType: TemplateStructureType;
  seedTasks?: Array<{
    name: string;
    phaseOrder?: number;
    estimatedHours?: number;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }>;
  seedPhases?: Array<{
    name: string;
    order: number;
    estimatedDurationDays?: number;
  }>;
  defaultImportOptions: TemplateImportOptions;
  executionConfiguration: {
    views: TemplateView[];
    fields: string[];
    statuses: TemplateStatus[];
    structureType: TemplateStructureType;
    documents: string[];
    taskLayout: 'phased' | 'flat';
  };
  governanceConfiguration: {
    capacityPolicy: string;
    budgetPolicy: string;
    requiredArtifacts: string[];
    riskModel: string;
    phaseGates: string[];
    approvalRules: string[];
    auditRequirements: string[];
    methodologyMapping: string;
  };
  previewImage?: string;
}

export interface CreateProjectFromTemplateInput {
  templateId: string;
  workspaceId: string;
  projectName: string;
  startDate?: string;
  endDate?: string;
  importOptions: TemplateImportOptions;
  /** Passed when backend DTO supports workflow (Phase 2). */
  workflow?: TemplateWorkflow;
}

export type { TemplateWorkflow } from './types/TemplateWorkflow';
export {
  DEFAULT_TEMPLATE_WORKFLOW,
  type TemplateWorkflowClosure,
  type TemplateWorkflowCreation,
  type TemplateWorkflowExecution,
  type TemplateWorkflowMonitoring,
  type TemplateWorkflowPhaseGateRule,
  type TemplateWorkflowReporting,
} from './types/TemplateWorkflow';

