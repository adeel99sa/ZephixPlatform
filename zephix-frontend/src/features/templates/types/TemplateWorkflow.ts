/**
 * Template workflow contract — shared FE contract; backend DTO alignment in Phase 2.
 *
 * Dependency notes (2026 Q2):
 * - copyAutomations: keep false until a real automation service + persistence exist.
 * - copyPhaseGates: wiring uses work-management phase_gate_definitions (no standalone
 *   PhaseGateService.create in repo today — use repository / project-governance paths).
 */

export interface TemplateWorkflowCreation {
  copyStructure: boolean;
  /** When true, instantiate phase gate definitions for created phases (backend TBD). */
  copyPhaseGates: boolean;
  /** Reserved — must stay false until automation module exists. */
  copyAutomations: boolean;
  assignDefaultRoles: boolean;
}

export interface TemplateWorkflowPhaseGateRule {
  phaseOrder: number;
  approverRoles: string[];
  autoLock: boolean;
  /** Optional display / audit label */
  name?: string;
  /** Checklist lines → maps to backend `required_checklist.items` */
  criteria?: string[];
}

export interface TemplateWorkflowExecution {
  phaseGateRules: TemplateWorkflowPhaseGateRule[];
}

/** Q3 — risk triggers, notifications */
export interface TemplateWorkflowMonitoring {
  riskTriggers?: unknown[];
}

/** Q3 — scheduled / milestone reports */
export interface TemplateWorkflowReporting {
  milestoneReports?: unknown[];
}

/** Q3 — archive, lessons learned, resource release */
export interface TemplateWorkflowClosure {
  archiveRules?: unknown[];
}

export interface TemplateWorkflow {
  creation: TemplateWorkflowCreation;
  execution: TemplateWorkflowExecution;
  monitoring?: TemplateWorkflowMonitoring;
  reporting?: TemplateWorkflowReporting;
  closure?: TemplateWorkflowClosure;
}

/** Safe default for templates with no workflow payload from API. */
export const DEFAULT_TEMPLATE_WORKFLOW: TemplateWorkflow = {
  creation: {
    copyStructure: true,
    copyPhaseGates: false,
    copyAutomations: false,
    assignDefaultRoles: false,
  },
  execution: {
    phaseGateRules: [],
  },
};
