import { useMemo } from "react";
import type { WorkspaceConfig } from "./TemplateArchitecture";
import { resolveWorkspaceConfigFromMock } from "./mockPolicies";
import { MOCK_BASELINE_NAMES } from "./mockPolicies";

/**
 * Phase 1: Resolves workspace config from mock policies.
 * Uses workspace name to determine Finance vs Engineering group.
 *
 * Critical check: governed = appliedBaselineId + lockedComponents.length > 0
 * - defaultTemplateId = starting point, owner can switch away → FREE
 * - mandatoryBaseline = locked components that persist → GOVERNED
 */
export function useWorkspaceConfig(
  workspaceId: string,
  workspaceName: string,
  currentCustomFieldsCount = 0
): {
  config: WorkspaceConfig;
  isGoverned: boolean;
  baselineName: string | null;
} {
  return useMemo(() => {
    const config = resolveWorkspaceConfigFromMock(
      workspaceId,
      workspaceName,
      currentCustomFieldsCount
    );

    // CRITICAL: governed = appliedBaselineId AND lockedComponents.length > 0
    // - defaultTemplateId = starting point, owner can switch away → FREE
    // - mandatoryBaseline = locked components that persist → GOVERNED
    const hasAppliedMandatoryBaseline =
      !!config.baselineTemplateId && config.lockedComponents.length > 0;

    const baselineName = config.baselineTemplateId
      ? MOCK_BASELINE_NAMES[config.baselineTemplateId] ?? config.baselineTemplateId
      : null;

    return {
      config,
      isGoverned: hasAppliedMandatoryBaseline,
      baselineName,
    };
  }, [workspaceId, workspaceName, currentCustomFieldsCount]);
}
