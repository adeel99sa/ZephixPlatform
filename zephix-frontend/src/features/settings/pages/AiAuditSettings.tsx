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

export type AiLogVisibility = "admin_only" | "admin_pmo" | "all_members";

export type AiRetentionPeriod = "30" | "90" | "365" | "indefinite";

export type AiAuditState = {
  logInteractions: boolean;
  logSuggestions: boolean;
  logExecutions: boolean;
  whoCanViewLogs: AiLogVisibility;
  showReasoningSummary: boolean;
  retentionPeriod: AiRetentionPeriod;
};

const INITIAL: AiAuditState = {
  logInteractions: true,
  logSuggestions: true,
  logExecutions: true,
  whoCanViewLogs: "admin_pmo",
  showReasoningSummary: true,
  retentionPeriod: "90",
};

function auditEquals(a: AiAuditState, b: AiAuditState): boolean {
  return (
    a.logInteractions === b.logInteractions &&
    a.logSuggestions === b.logSuggestions &&
    a.logExecutions === b.logExecutions &&
    a.whoCanViewLogs === b.whoCanViewLogs &&
    a.showReasoningSummary === b.showReasoningSummary &&
    a.retentionPeriod === b.retentionPeriod
  );
}

export default function AiAuditSettings(): ReactElement {
  const [state, setState] = useState<AiAuditState>(INITIAL);
  const [saved, setSaved] = useState<AiAuditState>(INITIAL);

  const dirty = useMemo(() => !auditEquals(state, saved), [state, saved]);

  const handleSave = useCallback(() => {
    setSaved({ ...state });
  }, [state]);

  return (
    <div data-settings-ai-audit>
      <SettingsPageHeader
        title="AI Audit"
        description="Retention, visibility, and evidence for AI-assisted activity."
      />

      <SettingsSection title="Logging">
        <SettingsRow
          variant="system"
          label="Log Interactions"
          description="Record prompts, sessions, and assistant invocations."
          badge="Audit"
          badgeTone="amber"
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="audit-interactions"
                checked={state.logInteractions}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    logInteractions: e.target.checked,
                  }))
                }
              />
            </ControlPlaneToggleShell>
          }
        />
        <SettingsRow
          variant="system"
          label="Log Suggestions"
          description="Retain proposed edits and ranked recommendations."
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="audit-suggestions"
                checked={state.logSuggestions}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    logSuggestions: e.target.checked,
                  }))
                }
              />
            </ControlPlaneToggleShell>
          }
        />
        <SettingsRow
          variant="system"
          label="Log Executions"
          description="Capture applied changes that originated from AI-assisted flows."
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="audit-executions"
                checked={state.logExecutions}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    logExecutions: e.target.checked,
                  }))
                }
              />
            </ControlPlaneToggleShell>
          }
        />
      </SettingsSection>

      <SettingsSection title="Visibility">
        <SettingsRow
          variant="system"
          label="Who Can View Logs"
          description="Who may review AI audit entries in the admin console."
          control={
            <select
              className={cn(SETTINGS_TABLE_SELECT_CLASS, "h-10 max-w-xs")}
              value={state.whoCanViewLogs}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  whoCanViewLogs: e.target.value as AiLogVisibility,
                }))
              }
              aria-label="Who can view AI logs"
            >
              <option value="admin_only">Admin only</option>
              <option value="admin_pmo">Admin + Governance Admin</option>
              <option value="all_members">All members</option>
            </select>
          }
        />
        <SettingsRow
          variant="system"
          label="Show Reasoning Summary"
          description="Store a concise rationale summary alongside each logged event."
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="audit-reasoning"
                checked={state.showReasoningSummary}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    showReasoningSummary: e.target.checked,
                  }))
                }
              />
            </ControlPlaneToggleShell>
          }
        />
      </SettingsSection>

      <SettingsSection title="Retention">
        <SettingsRow
          variant="system"
          label="Retention Period"
          description="How long AI audit records are kept before scheduled purge."
          control={
            <select
              className={cn(SETTINGS_TABLE_SELECT_CLASS, "h-10 max-w-xs")}
              value={state.retentionPeriod}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  retentionPeriod: e.target.value as AiRetentionPeriod,
                }))
              }
              aria-label="AI audit retention period"
            >
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
              <option value="indefinite">Indefinite</option>
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
