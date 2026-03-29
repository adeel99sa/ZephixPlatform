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


export type GateReviewSlaOption = "24h" | "48h" | "72h" | "1w";

export type ExceptionWorkflowsState = {
  allowPmoForceApprove: boolean;
  requireJustificationForOverrides: boolean;
  gateReviewSla: GateReviewSlaOption;
  autoEscalateToPmo: boolean;
};

const SLA_OPTIONS: { value: GateReviewSlaOption; label: string }[] = [
  { value: "24h", label: "24 Hours" },
  { value: "48h", label: "48 Hours" },
  { value: "72h", label: "72 Hours" },
  { value: "1w", label: "1 Week" },
];

const INITIAL: ExceptionWorkflowsState = {
  allowPmoForceApprove: false,
  requireJustificationForOverrides: true,
  gateReviewSla: "48h",
  autoEscalateToPmo: true,
};

function exceptionEquals(
  a: ExceptionWorkflowsState,
  b: ExceptionWorkflowsState,
): boolean {
  return (
    a.allowPmoForceApprove === b.allowPmoForceApprove &&
    a.requireJustificationForOverrides === b.requireJustificationForOverrides &&
    a.gateReviewSla === b.gateReviewSla &&
    a.autoEscalateToPmo === b.autoEscalateToPmo
  );
}

export default function ExceptionWorkflowsSettings(): ReactElement {
  const [state, setState] = useState<ExceptionWorkflowsState>(INITIAL);
  const [saved, setSaved] = useState<ExceptionWorkflowsState>(INITIAL);

  const dirty = useMemo(() => !exceptionEquals(state, saved), [state, saved]);

  const handleSave = useCallback(() => {
    setSaved({ ...state });
  }, [state]);

  const justificationDisabled = !state.allowPmoForceApprove;

  return (
    <div data-settings-exception-workflows>
      <SettingsPageHeader
        title="Exception Workflows"
        description="Define how overrides, SLA breaches, and escalations are handled."
      />

      <SettingsSection title="Gate Overrides">
        <SettingsRow
          variant="system"
          label="Allow governance force-approve"
          description="Allow governance leads to bypass locked gates and record an override decision."
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="exception-pmo-force"
                checked={state.allowPmoForceApprove}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    allowPmoForceApprove: e.target.checked,
                  }))
                }
              />
            </ControlPlaneToggleShell>
          }
        />
        <div
          className={cn(
            justificationDisabled &&
              "rounded-lg border border-dashed border-slate-200 bg-slate-50/70 opacity-[0.72] ring-1 ring-inset ring-slate-100",
          )}
          aria-disabled={justificationDisabled}
          data-exception-justification-locked={justificationDisabled}
        >
          <SettingsRow
            variant="system"
            label="Require Justification for Overrides"
            description="Require written justification when overriding a gate or locked task state."
            control={
              <ControlPlaneToggleShell
                className={cn(justificationDisabled && "cursor-not-allowed")}
              >
                <Switch
                  id="exception-justification"
                  checked={state.requireJustificationForOverrides}
                  disabled={justificationDisabled}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      requireJustificationForOverrides: e.target.checked,
                    }))
                  }
                />
              </ControlPlaneToggleShell>
            }
          />
        </div>
      </SettingsSection>

      <SettingsSection title="Escalation Paths">
        <SettingsRow
          variant="system"
          label="Gate Review SLA"
          description="Time allowed before a gate review triggers an SLA warning."
          control={
            <ControlPlaneToggleShell className="w-full max-w-xs">
              <select
                className={cn(SETTINGS_TABLE_SELECT_CLASS, "w-full min-w-[11rem]")}
                value={state.gateReviewSla}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    gateReviewSla: e.target.value as GateReviewSlaOption,
                  }))
                }
                aria-label="Gate review SLA"
              >
                {SLA_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </ControlPlaneToggleShell>
          }
        />
        <SettingsRow
          variant="system"
          label="Auto-escalate to governance lead"
          description="Notify governance leads automatically when a gate review breaches SLA."
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="exception-auto-escalate"
                checked={state.autoEscalateToPmo}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    autoEscalateToPmo: e.target.checked,
                  }))
                }
              />
            </ControlPlaneToggleShell>
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
