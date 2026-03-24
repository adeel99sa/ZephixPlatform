/**
 * Plain TS mirror of template workflow payload (DTOs in ../dto/template-workflow.dto.ts).
 * Use in services when avoiding class-validator types.
 */

export interface TemplateWorkflowCreation {
  copyStructure: boolean;
  copyPhaseGates: boolean;
  copyAutomations: boolean;
  assignDefaultRoles: boolean;
}

export interface PhaseGateRule {
  phaseOrder: number;
  approverRoles: string[];
  autoLock: boolean;
  name?: string;
  criteria?: string[];
}

export interface TemplateWorkflowExecution {
  phaseGateRules: PhaseGateRule[];
}

export interface TemplateWorkflowPayload {
  creation: TemplateWorkflowCreation;
  execution: TemplateWorkflowExecution;
}
