import { useCallback, useMemo, useState } from "react";
import type { ReactElement } from "react";

import { SETTINGS_TABLE_SELECT_CLASS } from "../constants/memberRoles";
import {
  ControlPlaneToggleShell,
  SettingsPageHeader,
  SettingsRow,
  SettingsSection,
} from "../components/ui";

import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/form/Switch";
import { cn } from "@/lib/utils";

export type AssistantTone = "neutral" | "concise" | "detailed";

export type EscalationMode = "suggest_only" | "suggest_notify_pmo";

export type QaScope = "current_project" | "workspace" | "portfolio";

export type AssistantBehaviorState = {
  tone: AssistantTone;
  governanceAwareness: boolean;
  includeRecommendations: boolean;
  gateAwareness: boolean;
  riskDetection: boolean;
  capacityAwareness: boolean;
  preventUnauthorizedActions: boolean;
  blockCriticalChanges: boolean;
  escalationMode: EscalationMode;
  enableWorkspaceQA: boolean;
  qaScope: QaScope;
};

const INITIAL: AssistantBehaviorState = {
  tone: "neutral",
  governanceAwareness: true,
  includeRecommendations: true,
  gateAwareness: true,
  riskDetection: true,
  capacityAwareness: true,
  preventUnauthorizedActions: true,
  blockCriticalChanges: true,
  escalationMode: "suggest_only",
  enableWorkspaceQA: true,
  qaScope: "workspace",
};

function behaviorEquals(
  a: AssistantBehaviorState,
  b: AssistantBehaviorState,
): boolean {
  return (
    a.tone === b.tone &&
    a.governanceAwareness === b.governanceAwareness &&
    a.includeRecommendations === b.includeRecommendations &&
    a.gateAwareness === b.gateAwareness &&
    a.riskDetection === b.riskDetection &&
    a.capacityAwareness === b.capacityAwareness &&
    a.preventUnauthorizedActions === b.preventUnauthorizedActions &&
    a.blockCriticalChanges === b.blockCriticalChanges &&
    a.escalationMode === b.escalationMode &&
    a.enableWorkspaceQA === b.enableWorkspaceQA &&
    a.qaScope === b.qaScope
  );
}

export default function AssistantBehaviorSettings(): ReactElement {
  const [state, setState] = useState<AssistantBehaviorState>(INITIAL);
  const [saved, setSaved] = useState<AssistantBehaviorState>(INITIAL);

  const dirty = useMemo(() => !behaviorEquals(state, saved), [state, saved]);

  const handleSave = useCallback(() => {
    setSaved({ ...state });
  }, [state]);

  return (
    <div data-settings-ai-assistant>
      <SettingsPageHeader
        title="AI Assistant"
        description="Tune how the assistant responds while staying inside governance boundaries."
      />

      <SettingsSection title="Response">
        <SettingsRow
          variant="system"
          label="Tone"
          description="Verbosity and style of assistant replies."
          control={
            <select
              className={cn(SETTINGS_TABLE_SELECT_CLASS, "h-10 max-w-xs")}
              value={state.tone}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  tone: e.target.value as AssistantTone,
                }))
              }
              aria-label="Assistant tone"
            >
              <option value="neutral">Neutral</option>
              <option value="concise">Concise</option>
              <option value="detailed">Detailed</option>
            </select>
          }
        />
        <SettingsRow
          variant="system"
          label="Governance Awareness"
          description="Reference gates, approvals, and policy when explaining recommendations."
          badge="Governance"
          badgeTone="amber"
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="asst-gov-awareness"
                checked={state.governanceAwareness}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    governanceAwareness: e.target.checked,
                  }))
                }
              />
            </ControlPlaneToggleShell>
          }
        />
        <SettingsRow
          variant="system"
          label="Include Recommendations"
          description="Surface next-best actions when they align with visible data and permissions."
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="asst-recommendations"
                checked={state.includeRecommendations}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    includeRecommendations: e.target.checked,
                  }))
                }
              />
            </ControlPlaneToggleShell>
          }
        />
      </SettingsSection>

      <SettingsSection title="Workflow Awareness">
        <SettingsRow
          variant="system"
          label="Gate Awareness"
          description="Acknowledge phase gates and approval state in answers."
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="asst-gate"
                checked={state.gateAwareness}
                onChange={(e) =>
                  setState((s) => ({ ...s, gateAwareness: e.target.checked }))
                }
              />
            </ControlPlaneToggleShell>
          }
        />
        <SettingsRow
          variant="system"
          label="Risk Detection"
          description="Highlight emerging risks when signals are available."
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="asst-risk"
                checked={state.riskDetection}
                onChange={(e) =>
                  setState((s) => ({ ...s, riskDetection: e.target.checked }))
                }
              />
            </ControlPlaneToggleShell>
          }
        />
        <SettingsRow
          variant="system"
          label="Capacity Awareness"
          description="Factor utilization and allocation context when discussing workload."
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="asst-capacity"
                checked={state.capacityAwareness}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    capacityAwareness: e.target.checked,
                  }))
                }
              />
            </ControlPlaneToggleShell>
          }
        />
      </SettingsSection>

      <SettingsSection title="Safety">
        <SettingsRow
          variant="system"
          label="Prevent Unauthorized Actions"
          description="Always on. AI cannot bypass role or workspace boundaries."
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="asst-unauth"
                checked={state.preventUnauthorizedActions}
                disabled
              />
            </ControlPlaneToggleShell>
          }
        />
        <SettingsRow
          variant="system"
          label="Block Critical Changes"
          description="Never auto-apply changes. Blocks: gate decisions, approvals, and project state."
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="asst-block-critical"
                checked={state.blockCriticalChanges}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    blockCriticalChanges: e.target.checked,
                  }))
                }
              />
            </ControlPlaneToggleShell>
          }
        />
        <SettingsRow
          variant="system"
          label="Escalation Mode"
          description="How the assistant escalates when it detects policy tension."
          control={
            <fieldset
              className="flex w-full max-w-md flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3 shadow-sm"
              aria-label="Escalation mode"
            >
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                <input
                  type="radio"
                  name="asst-escalation"
                  className="h-4 w-4 border-slate-300 text-amber-700 focus:ring-amber-600"
                  checked={state.escalationMode === "suggest_only"}
                  onChange={() =>
                    setState((s) => ({ ...s, escalationMode: "suggest_only" }))
                  }
                />
                Suggest only
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                <input
                  type="radio"
                  name="asst-escalation"
                  className="h-4 w-4 border-slate-300 text-amber-700 focus:ring-amber-600"
                  checked={state.escalationMode === "suggest_notify_pmo"}
                  onChange={() =>
                    setState((s) => ({
                      ...s,
                      escalationMode: "suggest_notify_pmo",
                    }))
                  }
                />
                Suggest + notify governance lead
              </label>
              <label
                className="flex cursor-not-allowed items-center gap-2 text-sm text-slate-400"
                title="Autonomous escalation is disabled."
              >
                <input
                  type="radio"
                  name="asst-escalation"
                  className="h-4 w-4 cursor-not-allowed opacity-60"
                  disabled
                  aria-disabled
                />
                Auto escalate
              </label>
            </fieldset>
          }
        />
      </SettingsSection>

      <SettingsSection title="Global Q&A">
        <SettingsRow
          variant="system"
          label="Enable Workspace Q&A"
          description="Allow natural-language questions against permitted workspace context."
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="asst-ws-qa"
                checked={state.enableWorkspaceQA}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    enableWorkspaceQA: e.target.checked,
                  }))
                }
              />
            </ControlPlaneToggleShell>
          }
        />
        <SettingsRow
          variant="system"
          label="Scope"
          description="AI can answer questions across projects based on permissions."
          control={
            <select
              className={cn(SETTINGS_TABLE_SELECT_CLASS, "h-10 max-w-xs")}
              value={state.qaScope}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  qaScope: e.target.value as QaScope,
                }))
              }
              aria-label="Workspace Q&A scope"
            >
              <option value="current_project">Current project only</option>
              <option value="workspace">Workspace</option>
              <option value="portfolio">Portfolio</option>
            </select>
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
