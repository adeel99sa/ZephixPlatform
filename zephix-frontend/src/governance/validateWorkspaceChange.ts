/**
 * Workspace change validation — enforces locked governance and extension limits.
 */

import type { GovernanceComponent, WorkspaceConfig } from "./TemplateArchitecture";

export interface ChangeRequest {
  type: "add-field" | "remove-field" | "modify-phase" | "bypass-gate" | "disable-audit" | "remove-budget" | "other";
  component?: GovernanceComponent;
  affectsGovernance?: boolean;
}

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
  requiresAdminOverride?: boolean;
}

export function validateWorkspaceChange(
  workspace: WorkspaceConfig,
  proposedChange: ChangeRequest
): ValidationResult {
  if (proposedChange.affectsGovernance && proposedChange.component) {
    const isLocked = workspace.lockedComponents.includes(proposedChange.component);
    if (isLocked) {
      return {
        allowed: false,
        reason: `${proposedChange.component} is required by organization policy`,
        requiresAdminOverride: true,
      };
    }
  }

  if (proposedChange.type === "add-field") {
    if (workspace.customFields.length >= workspace.maxCustomFields) {
      return {
        allowed: false,
        reason: `Maximum ${workspace.maxCustomFields} custom fields allowed`,
      };
    }
  }

  if (proposedChange.type === "remove-field") {
    const component = proposedChange.component ?? "required-fields";
    if (workspace.lockedComponents.includes(component)) {
      return {
        allowed: false,
        reason: "Required fields cannot be removed",
        requiresAdminOverride: true,
      };
    }
  }

  if (proposedChange.type === "bypass-gate" || proposedChange.type === "modify-phase") {
    if (workspace.lockedComponents.includes("phase-gates")) {
      return {
        allowed: false,
        reason: "Phase gates are required by organization policy",
        requiresAdminOverride: true,
      };
    }
  }

  if (proposedChange.type === "disable-audit") {
    if (workspace.lockedComponents.includes("audit-fields")) {
      return {
        allowed: false,
        reason: "Audit logging is required for compliance",
        requiresAdminOverride: true,
      };
    }
  }

  if (proposedChange.type === "remove-budget") {
    if (workspace.lockedComponents.includes("budget-controls")) {
      return {
        allowed: false,
        reason: "Budget controls are required by organization policy",
        requiresAdminOverride: true,
      };
    }
  }

  return { allowed: true };
}
