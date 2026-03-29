import { useCallback, useMemo, useState } from "react";
import type { ReactElement } from "react";

import {
  WORKSPACE_MEMBER_ROLE_LABELS,
  WORKSPACE_MEMBER_ROLE_ORDER,
  SETTINGS_TABLE_SELECT_CLASS,
} from "../constants/memberRoles";
import type { WorkspaceMemberRole } from "../constants/memberRoles";
import {
  ControlPlaneToggleShell,
  SettingsPageHeader,
  SettingsRow,
  SettingsSection,
} from "../components/ui";

import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/form/Switch";
import { cn } from "@/lib/utils";

export type CrossProjectContext = "disabled" | "workspace_only" | "full_portfolio";

export type AiActionMode = "suggest_only" | "suggest_draft";

export type AiAllowedActions = {
  createTasks: boolean;
  updateFields: boolean;
  generateDocs: boolean;
  suggestRisks: boolean;
  suggestSchedule: boolean;
  recommendResources: boolean;
};

export type AiPolicyState = {
  enableAi: boolean;
  allowAiGovernedProjects: boolean;
  roleAccess: Record<WorkspaceMemberRole, boolean>;
  limitAiToVisibleScope: boolean;
  crossProjectContext: CrossProjectContext;
  includeGovernanceData: boolean;
  actionMode: AiActionMode;
  requireConfirmation: boolean;
  requireApprovalGovernanceActions: boolean;
  allowedActions: AiAllowedActions;
};

const ROLE_ORDER_FOR_AI: WorkspaceMemberRole[] = WORKSPACE_MEMBER_ROLE_ORDER;

const INITIAL_ROLE_ACCESS: Record<WorkspaceMemberRole, boolean> = {
  workspace_owner: true,
  admin: true,
  governance_admin: true,
  project_manager: true,
  member: false,
  read_only: false,
};

const INITIAL_ALLOWED: AiAllowedActions = {
  createTasks: true,
  updateFields: true,
  generateDocs: true,
  suggestRisks: true,
  suggestSchedule: true,
  recommendResources: false,
};

const INITIAL: AiPolicyState = {
  enableAi: true,
  allowAiGovernedProjects: true,
  roleAccess: { ...INITIAL_ROLE_ACCESS },
  limitAiToVisibleScope: true,
  crossProjectContext: "disabled",
  includeGovernanceData: true,
  actionMode: "suggest_only",
  requireConfirmation: true,
  requireApprovalGovernanceActions: true,
  allowedActions: { ...INITIAL_ALLOWED },
};

function roleAccessEquals(
  a: Record<WorkspaceMemberRole, boolean>,
  b: Record<WorkspaceMemberRole, boolean>,
): boolean {
  return ROLE_ORDER_FOR_AI.every((k) => a[k] === b[k]);
}

function allowedEquals(a: AiAllowedActions, b: AiAllowedActions): boolean {
  return (
    a.createTasks === b.createTasks &&
    a.updateFields === b.updateFields &&
    a.generateDocs === b.generateDocs &&
    a.suggestRisks === b.suggestRisks &&
    a.suggestSchedule === b.suggestSchedule &&
    a.recommendResources === b.recommendResources
  );
}

function policyEquals(a: AiPolicyState, b: AiPolicyState): boolean {
  return (
    a.enableAi === b.enableAi &&
    a.allowAiGovernedProjects === b.allowAiGovernedProjects &&
    roleAccessEquals(a.roleAccess, b.roleAccess) &&
    a.limitAiToVisibleScope === b.limitAiToVisibleScope &&
    a.crossProjectContext === b.crossProjectContext &&
    a.includeGovernanceData === b.includeGovernanceData &&
    a.actionMode === b.actionMode &&
    a.requireConfirmation === b.requireConfirmation &&
    a.requireApprovalGovernanceActions === b.requireApprovalGovernanceActions &&
    allowedEquals(a.allowedActions, b.allowedActions)
  );
}

const ALLOWED_ACTION_LABELS: { key: keyof AiAllowedActions; label: string }[] = [
  { key: "createTasks", label: "Create tasks" },
  { key: "updateFields", label: "Update fields" },
  { key: "generateDocs", label: "Generate docs" },
  { key: "suggestRisks", label: "Suggest risks" },
  { key: "suggestSchedule", label: "Suggest schedule" },
  { key: "recommendResources", label: "Recommend resources" },
];

export default function AiPolicySettings(): ReactElement {
  const [state, setState] = useState<AiPolicyState>(INITIAL);
  const [saved, setSaved] = useState<AiPolicyState>(INITIAL);

  const dirty = useMemo(() => !policyEquals(state, saved), [state, saved]);

  const handleSave = useCallback(() => {
    setSaved({
      ...state,
      roleAccess: { ...state.roleAccess },
      allowedActions: { ...state.allowedActions },
    });
  }, [state]);

  return (
    <div data-settings-ai-policy>
      <SettingsPageHeader
        title="AI Policy"
        description="Control how AI operates across governed workflows."
      />

      <SettingsSection title="Global Access">
        <SettingsRow
          variant="system"
          label="Enable AI"
          description="Master switch for AI-assisted features in this organization."
          badge="Governance"
          badgeTone="amber"
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="ai-enable"
                checked={state.enableAi}
                onChange={(e) =>
                  setState((s) => ({ ...s, enableAi: e.target.checked }))
                }
              />
            </ControlPlaneToggleShell>
          }
        />
        <SettingsRow
          variant="system"
          label="Allow AI in Governed Projects"
          description="Permit AI suggestions and drafts when project governance is elevated."
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="ai-governed"
                checked={state.allowAiGovernedProjects}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    allowAiGovernedProjects: e.target.checked,
                  }))
                }
              />
            </ControlPlaneToggleShell>
          }
        />
        <SettingsRow
          variant="system"
          label="Role Access"
          description="Which roles may invoke AI. Read-only and member tiers stay off by default."
          control={
            <div className="flex w-full max-w-sm flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
              {ROLE_ORDER_FOR_AI.map((role) => (
                <label
                  key={role}
                  className="flex cursor-pointer items-center gap-2 text-sm text-slate-800"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-amber-700 focus:ring-amber-600"
                    checked={state.roleAccess[role]}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        roleAccess: {
                          ...s.roleAccess,
                          [role]: e.target.checked,
                        },
                      }))
                    }
                  />
                  <span>{WORKSPACE_MEMBER_ROLE_LABELS[role]}</span>
                </label>
              ))}
            </div>
          }
        />
      </SettingsSection>

      <SettingsSection title="Context Control">
        <SettingsRow
          variant="system"
          label="Limit AI to Visible Scope"
          description="Restrict context to what the user can already see in the UI."
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="ai-visible-scope"
                checked={state.limitAiToVisibleScope}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    limitAiToVisibleScope: e.target.checked,
                  }))
                }
              />
            </ControlPlaneToggleShell>
          }
        />
        <SettingsRow
          variant="system"
          label="Cross-Project Context"
          description="Whether AI may use signals from beyond the current project."
          control={
            <select
              className={cn(SETTINGS_TABLE_SELECT_CLASS, "h-10 max-w-xs")}
              value={state.crossProjectContext}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  crossProjectContext: e.target.value as CrossProjectContext,
                }))
              }
              aria-label="Cross-project context"
            >
              <option value="disabled">Disabled</option>
              <option value="workspace_only">Workspace Only</option>
              <option value="full_portfolio">Full Portfolio</option>
            </select>
          }
        />
        <SettingsRow
          variant="system"
          label="Include Governance Data"
          description="Allow phase gates, approvals, and policy state in AI context when permitted."
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="ai-gov-data"
                checked={state.includeGovernanceData}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    includeGovernanceData: e.target.checked,
                  }))
                }
              />
            </ControlPlaneToggleShell>
          }
        />
      </SettingsSection>

      <SettingsSection title="Action Control">
        <SettingsRow
          variant="system"
          label="Mode"
          description="Execution posture for AI: suggestions and drafts stay human-in-the-loop."
          control={
            <fieldset
              className="flex w-full max-w-md flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3 shadow-sm"
              aria-label="AI action mode"
            >
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                <input
                  type="radio"
                  name="ai-action-mode"
                  className="h-4 w-4 border-slate-300 text-amber-700 focus:ring-amber-600"
                  checked={state.actionMode === "suggest_only"}
                  onChange={() =>
                    setState((s) => ({ ...s, actionMode: "suggest_only" }))
                  }
                />
                Suggest only
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                <input
                  type="radio"
                  name="ai-action-mode"
                  className="h-4 w-4 border-slate-300 text-amber-700 focus:ring-amber-600"
                  checked={state.actionMode === "suggest_draft"}
                  onChange={() =>
                    setState((s) => ({ ...s, actionMode: "suggest_draft" }))
                  }
                />
                Suggest + Draft
              </label>
              <label
                className="flex cursor-not-allowed items-center gap-2 text-sm text-slate-400"
                title="Not available — autonomous execution is out of scope."
              >
                <input
                  type="radio"
                  name="ai-action-mode"
                  className="h-4 w-4 cursor-not-allowed opacity-60"
                  disabled
                  aria-disabled
                />
                Suggest + Execute
              </label>
            </fieldset>
          }
        />
        <SettingsRow
          variant="system"
          label="Require Confirmation"
          description="Prompt before applying any AI-proposed change."
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="ai-require-confirm"
                checked={state.requireConfirmation}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    requireConfirmation: e.target.checked,
                  }))
                }
              />
            </ControlPlaneToggleShell>
          }
        />
        <SettingsRow
          variant="system"
          label="Require Approval for Governance Actions"
          description="Gate decisions, template changes, and policy-impacting operations."
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="ai-approval-gov"
                checked={state.requireApprovalGovernanceActions}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    requireApprovalGovernanceActions: e.target.checked,
                  }))
                }
              />
            </ControlPlaneToggleShell>
          }
        />
        <SettingsRow
          variant="system"
          label="Allowed Actions"
          description="Capabilities AI may propose when policy allows."
          control={
            <div className="flex w-full max-w-sm flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
              {ALLOWED_ACTION_LABELS.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 text-sm text-slate-800"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-amber-700 focus:ring-amber-600"
                    checked={state.allowedActions[key]}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        allowedActions: {
                          ...s.allowedActions,
                          [key]: e.target.checked,
                        },
                      }))
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          }
        />
      </SettingsSection>

      <footer className="mt-10 flex justify-end border-t border-slate-200 pt-6">
        <Button type="button" disabled={!dirty} onClick={handleSave}>
          Save Changes
        </Button>
      </footer>
    </div>
  );
}
