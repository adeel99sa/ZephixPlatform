/**
 * Layered Template Architecture — Enterprise Governance Model
 *
 * Three-layer model: Base Structure, Governance Lock, Workspace Extensions.
 * Assignment scopes and policy controls (default vs mandatory baseline).
 */

// ── Layer 1: Base Structure ───────────────────────────────────────────────

export interface PhaseConfig {
  id: string;
  name: string;
  order: number;
  gateRequired?: boolean;
}

export interface ViewConfig {
  id: string;
  type: "list" | "board" | "gantt" | "calendar";
  name: string;
}

export interface FieldConfig {
  id: string;
  key: string;
  label: string;
  type: string;
  required?: boolean;
}

export interface PhaseGateConfig {
  phaseId: string;
  approverRole?: string;
  autoApprove?: boolean;
}

export interface ApprovalConfig {
  id: string;
  type: string;
  requiredApprovals: number;
}

export interface RuleConfig {
  id: string;
  type: string;
  enabled: boolean;
}

export interface BudgetConfig {
  enabled: boolean;
  requireApprovalAbove?: number;
}

export interface AuditConfig {
  fields: string[];
  enabled: boolean;
}

// ── Layered Template Model ────────────────────────────────────────────────

export interface LayeredTemplate {
  base: {
    id: string;
    name: string;
    description: string;
    phases: PhaseConfig[];
    defaultViews: ViewConfig[];
    coreFields: FieldConfig[];
  };

  governance: {
    isMandatory: boolean;
    lockedComponents: {
      phaseGates?: PhaseGateConfig[];
      approvalWorkflows?: ApprovalConfig[];
      requiredFields?: FieldConfig[];
      complianceRules?: RuleConfig[];
      budgetControls?: BudgetConfig[];
      auditFields?: AuditConfig[];
    };
  };

  extensions: {
    allowedAdditions: {
      views: boolean;
      customFields: boolean;
      automations: boolean;
      statuses: boolean;
      teamLayouts: boolean;
    };
    maximums: {
      maxCustomFields: number;
      maxAutomations: number;
    };
  };
}

// ── Assignment Scopes ─────────────────────────────────────────────────────

export type AssignmentScope =
  | { type: "org-wide" }
  | { type: "workspace-group"; groupId: string }
  | { type: "specific-workspace"; workspaceId: string }
  | {
      type: "template-library-policy";
      allowCustom: boolean;
      requireApproval: boolean;
    };

// ── Template Policy Controls ──────────────────────────────────────────────

export type GovernanceComponentKey =
  | "phaseGates"
  | "approvalWorkflows"
  | "requiredFields"
  | "complianceRules"
  | "budgetControls"
  | "auditFields";

export interface DefaultTemplatePolicy {
  templateId: string;
  scope: AssignmentScope;
  allowChange: true;
}

export interface MandatoryBaselinePolicy {
  templateId: string;
  scope: AssignmentScope;
  lockedComponents: GovernanceComponentKey[];
  allowExtensions: boolean;
}

export interface TemplatePolicy {
  defaultTemplate?: {
    templateId: string;
    scope: AssignmentScope;
    allowChange: true;
  };
  mandatoryBaseline?: MandatoryBaselinePolicy;
}

// ── Data Model (Simplified) ────────────────────────────────────────────────

/** Category for catalog / library entries (governance docs and planners). */
export type TemplateCategory =
  | "project-management"
  | "compliance"
  | "engineering";

/** Simplified template row for architecture diagrams and policy UI. */
export interface TemplateLibraryEntry {
  id: string;
  name: string;
  category: TemplateCategory;
  structure: unknown;
  isVerified: boolean;
}

export type GovernanceComponent =
  | "phase-gates"
  | "approval-workflows"
  | "required-fields"
  | "compliance-rules"
  | "budget-controls"
  | "audit-fields";

export interface GovernancePolicy {
  id: string;
  orgId: string;
  defaultTemplateId?: string;
  mandatoryBaseline?: {
    templateId: string;
    lockedComponents: GovernanceComponent[];
  };
  scope: {
    type: "org" | "workspace-group" | "workspace";
    targetId: string;
  };
  allowedExtensions: {
    views: boolean;
    customFields: boolean;
    maxCustomFields: number;
    automations: boolean;
    teamLayouts: boolean;
  };
}

export interface WorkspaceConfig {
  workspaceId: string;
  baselineTemplateId: string;
  lockedComponents: GovernanceComponent[];
  customViews: ViewConfig[];
  customFields: FieldConfig[];
  automations: unknown[];
  maxCustomFields: number;
}
