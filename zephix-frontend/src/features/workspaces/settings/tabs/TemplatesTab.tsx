import { FreeWorkspaceView } from "../../governance/FreeWorkspaceView";
import { GovernedWorkspaceView } from "../../governance/GovernedWorkspaceView";
import { useWorkspaceConfig } from "@/governance/useWorkspaceConfig";

interface TemplatesTabProps {
  workspaceId: string;
  workspaceName: string;
  /** Current count of custom fields (from API later); used for validation */
  currentCustomFieldsCount?: number;
}

/**
 * Templates tab for workspace settings.
 * Renders FreeWorkspaceView or GovernedWorkspaceView based on resolved config.
 *
 * Critical: governed = appliedBaselineId AND lockedComponents.length > 0
 * - defaultTemplateId alone → FREE (owner can switch)
 * - mandatoryBaseline with locked components → GOVERNED
 */
export default function TemplatesTab({
  workspaceId,
  workspaceName,
  currentCustomFieldsCount = 0,
}: TemplatesTabProps) {
  const { config, isGoverned, baselineName } = useWorkspaceConfig(
    workspaceId,
    workspaceName,
    currentCustomFieldsCount
  );

  if (isGoverned) {
    return (
      <GovernedWorkspaceView
        workspaceConfig={config}
        baselineName={baselineName ?? undefined}
        onAddView={() => {}}
        onAddField={() => {}}
        onConfigureAutomations={() => {}}
      />
    );
  }

  return (
    <FreeWorkspaceView
      onAddFromLibrary={() => {}}
      onCustomizeViews={() => {}}
      onAddField={() => {}}
      onConfigureAutomations={() => {}}
    />
  );
}
