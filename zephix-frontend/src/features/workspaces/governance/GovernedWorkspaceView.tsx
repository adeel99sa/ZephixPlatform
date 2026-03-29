import { useState } from "react";
import {
  Layout,
  FormInput,
  Zap,
  GitBranch,
  AlertTriangle,
  History,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import type { WorkspaceConfig } from "@/governance/TemplateArchitecture";
import { validateWorkspaceChange } from "@/governance/validateWorkspaceChange";
import { FeatureCard } from "./FeatureCard";

interface GovernedWorkspaceViewProps {
  workspaceConfig: WorkspaceConfig;
  baselineName?: string;
  onAddView?: () => void;
  onAddField?: () => void;
  onConfigureAutomations?: () => void;
}

export function GovernedWorkspaceView({
  workspaceConfig,
  baselineName = "SOX Compliance Baseline",
  onAddView,
  onAddField,
  onConfigureAutomations,
}: GovernedWorkspaceViewProps) {
  const { customFields, maxCustomFields, lockedComponents } = workspaceConfig;
  // Phase 1: local count for "Add Field" demo (persists for session)
  const [localFieldCount, setLocalFieldCount] = useState(customFields.length);
  const effectiveCount = customFields.length + localFieldCount;
  const remainingFields = Math.max(0, maxCustomFields - effectiveCount);
  const customFieldsLimit = `${effectiveCount}/${maxCustomFields}`;

  const handleAddField = () => {
    // Validate with current effective count (config + local additions)
    const configForValidation: WorkspaceConfig = {
      ...workspaceConfig,
      customFields: [
        ...customFields,
        ...Array.from({ length: localFieldCount }, (_, i) => ({
          id: `local-${i}`,
          key: `local_${i}`,
          label: `Field ${i + 1}`,
          type: "text" as const,
        })),
      ],
    };
    const result = validateWorkspaceChange(configForValidation, {
      type: "add-field",
    });
    if (!result.allowed) {
      toast.error(result.reason ?? "Change not allowed");
      return;
    }
    setLocalFieldCount((c) => c + 1);
    onAddField?.();
  };

  const handleTryRemoveRiskLevel = () => {
    const result = validateWorkspaceChange(workspaceConfig, {
      type: "remove-field",
      component: "required-fields",
      affectsGovernance: true,
    });
    if (!result.allowed) {
      toast.error(result.reason ?? "Change not allowed");
      return;
    }
    // Would never reach here when locked
  };
  return (
    <div className="p-8">
      {/* Governance Notice */}
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <Shield className="mt-0.5 shrink-0 text-blue-600" size={20} />
        <div>
          <div className="font-medium text-blue-900">
            Organization Baseline Applied
          </div>
          <div className="text-sm text-blue-700">
            This workspace uses <strong>{baselineName}</strong>. Required
            governance components are locked. You can still customize
            delivery setup.
          </div>
        </div>
      </div>

      {/* Locked Governance Section */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-z-text-secondary">
          Locked Governance (Required)
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Phase Gates"
            description="5 phases with approval requirements"
            icon={GitBranch}
            locked
            tooltip="Required by Finance Group policy"
          />
          <FeatureCard
            title="Risk Fields"
            description="Risk level, mitigation required"
            icon={AlertTriangle}
            locked
            tooltip="Cannot be removed"
            onTryRemove={lockedComponents.includes("required-fields") ? handleTryRemoveRiskLevel : undefined}
          />
          <FeatureCard
            title="Audit Trail"
            description="Full change logging active"
            icon={History}
            locked
            tooltip="Compliance requirement"
          />
        </div>
      </div>

      {/* Editable Extensions Section */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-z-text-secondary">
          Your Customizations (Editable)
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Team Views"
            description="Add custom views for your team"
            icon={Layout}
            action="Add View"
            editable
          />
          <FeatureCard
            title="Custom Fields"
            description={`Up to ${maxCustomFields} additional fields`}
            icon={FormInput}
            action="Add Field"
            editable
            limit={remainingFields > 0 ? `${remainingFields}/${maxCustomFields} remaining` : `${customFieldsLimit} (max reached)`}
            onAction={handleAddField}
          />
          <FeatureCard
            title="Automations"
            description="Workflows within allowed bounds"
            icon={Zap}
            action="Configure"
            editable
          />
        </div>
      </div>
    </div>
  );
}
