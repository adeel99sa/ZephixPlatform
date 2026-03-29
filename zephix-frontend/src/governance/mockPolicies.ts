/**
 * Phase 1: Fake Backend — Hardcoded governance policies for UI flow testing.
 *
 * Test scenarios:
 * 1. Workspace in Finance Group (name contains "Finance") → Governed view with locked cards
 * 2. Try to delete "Risk Level" field → Validation error
 * 3. Try to add 11th custom field → Limit error
 * 4. Workspace in Engineering Group (other names) → Free view
 */

import type { GovernancePolicy, WorkspaceConfig } from "./TemplateArchitecture";
import type { FieldConfig } from "./TemplateArchitecture";

export const mockFinancePolicy: GovernancePolicy = {
  id: "finance-sox",
  orgId: "org-1",
  mandatoryBaseline: {
    templateId: "sox-compliance",
    lockedComponents: [
      "phase-gates",
      "approval-workflows",
      "audit-fields",
      "required-fields",
    ],
  },
  scope: { type: "workspace-group", targetId: "finance" },
  allowedExtensions: {
    views: true,
    customFields: true,
    maxCustomFields: 10,
    automations: true,
    teamLayouts: false,
  },
};

/** Engineering has no mandatory baseline — free workspace */
export const mockEngineeringPolicy: GovernancePolicy = {
  id: "engineering-default",
  orgId: "org-1",
  defaultTemplateId: "agile-dev",
  scope: { type: "workspace-group", targetId: "engineering" },
  allowedExtensions: {
    views: true,
    customFields: true,
    maxCustomFields: 20,
    automations: true,
    teamLayouts: true,
  },
};

const MOCK_LOCKED_FIELDS: FieldConfig[] = [
  { id: "risk-level", key: "risk_level", label: "Risk Level", type: "select", required: true },
  { id: "mitigation", key: "mitigation", label: "Mitigation Required", type: "text" },
];

/**
 * Resolves workspace config from mock policies.
 * Finance Group workspaces (name contains "Finance") get governed config.
 * Others get free config.
 */
export function resolveWorkspaceConfigFromMock(
  workspaceId: string,
  workspaceName: string,
  /** Current custom fields count (from real API later) */
  currentCustomFieldsCount = 0
): WorkspaceConfig {
  const isFinanceGroup = workspaceName.toLowerCase().includes("finance");

  if (isFinanceGroup && mockFinancePolicy.mandatoryBaseline) {
    const { templateId, lockedComponents } = mockFinancePolicy.mandatoryBaseline;
    const { maxCustomFields } = mockFinancePolicy.allowedExtensions;
    return {
      workspaceId,
      baselineTemplateId: templateId,
      lockedComponents,
      customViews: [],
      customFields: Array.from({ length: currentCustomFieldsCount }, (_, i) => ({
        id: `custom-${i}`,
        key: `custom_${i}`,
        label: `Custom Field ${i + 1}`,
        type: "text",
      })),
      automations: [],
      maxCustomFields,
    };
  }

  /** Free workspace — no mandatory baseline, no locked components */
  const maxCustomFields =
    mockEngineeringPolicy.allowedExtensions?.maxCustomFields ?? 20;
  return {
    workspaceId,
    baselineTemplateId: "", // No applied mandatory baseline
    lockedComponents: [],
    customViews: [],
    customFields: Array.from({ length: currentCustomFieldsCount }, (_, i) => ({
      id: `custom-${i}`,
      key: `custom_${i}`,
      label: `Custom Field ${i + 1}`,
      type: "text",
    })),
    automations: [],
    maxCustomFields,
  };
}

/**
 * Returns the locked (required) fields for governed workspaces.
 * Used to show "Risk Level" etc. in the governed UI.
 */
export function getLockedFieldsForPolicy(policyId: string): FieldConfig[] {
  if (policyId === "finance-sox") return MOCK_LOCKED_FIELDS;
  return [];
}

export const MOCK_BASELINE_NAMES: Record<string, string> = {
  "sox-compliance": "SOX Compliance Baseline",
  "agile-dev": "Agile Development",
};
