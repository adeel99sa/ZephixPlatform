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


export type TemplateUpdateBehavior =
  | "manual_review"
  | "auto_apply_non_destructive"
  | "strict_sync";

export type TemplateEnforcementState = {
  requireApprovedTemplates: boolean;
  lockTemplateArtifacts: boolean;
  templateUpdateBehavior: TemplateUpdateBehavior;
};

const UPDATE_BEHAVIOR_OPTIONS: {
  value: TemplateUpdateBehavior;
  label: string;
}[] = [
  { value: "manual_review", label: "Manual Review" },
  {
    value: "auto_apply_non_destructive",
    label: "Auto-Apply Non-Destructive",
  },
  { value: "strict_sync", label: "Strict Sync" },
];

/** One sentence max per mode (delta propagation). */
const DELTA_HELPER_ONE_LINE: Record<TemplateUpdateBehavior, string> = {
  manual_review: "Owners approve every delta before it applies.",
  auto_apply_non_destructive:
    "Safe updates apply without removing existing work.",
  strict_sync: "Projects stay aligned with the published template.",
};

const INITIAL: TemplateEnforcementState = {
  requireApprovedTemplates: true,
  lockTemplateArtifacts: true,
  templateUpdateBehavior: "manual_review",
};

function templateEquals(
  a: TemplateEnforcementState,
  b: TemplateEnforcementState,
): boolean {
  return (
    a.requireApprovedTemplates === b.requireApprovedTemplates &&
    a.lockTemplateArtifacts === b.lockTemplateArtifacts &&
    a.templateUpdateBehavior === b.templateUpdateBehavior
  );
}

export default function TemplateEnforcementSettings(): ReactElement {
  const [state, setState] = useState<TemplateEnforcementState>(INITIAL);
  const [saved, setSaved] = useState<TemplateEnforcementState>(INITIAL);

  const dirty = useMemo(() => !templateEquals(state, saved), [state, saved]);

  const handleSave = useCallback(() => {
    setSaved({ ...state });
  }, [state]);

  return (
    <div data-settings-template-enforcement>
      <SettingsPageHeader
        title="Template Enforcement"
        description="Control how projects are instantiated and how template updates propagate."
      />

      <SettingsSection title="Instantiation Rules">
        <SettingsRow
          variant="system"
          label="Require Approved Templates"
          description="Prevent users from creating blank projects from scratch."
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="template-require-approved"
                checked={state.requireApprovedTemplates}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    requireApprovedTemplates: e.target.checked,
                  }))
                }
              />
            </ControlPlaneToggleShell>
          }
        />
        <SettingsRow
          variant="system"
          label="Lock Template Artifacts"
          description="Prevent users from removing the Gate Artifact flag from template-generated tasks."
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="template-lock-artifacts"
                checked={state.lockTemplateArtifacts}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    lockTemplateArtifacts: e.target.checked,
                  }))
                }
              />
            </ControlPlaneToggleShell>
          }
        />
      </SettingsSection>

      <SettingsSection title="Delta Propagation">
        <SettingsRow
          variant="system"
          label="Template Update Behavior"
          description="Define how published template changes affect active projects bound to that template."
          control={
            <div className="flex max-w-md flex-col items-end gap-2 sm:max-w-lg">
              <select
                className={cn(SETTINGS_TABLE_SELECT_CLASS, "w-full max-w-xs")}
                value={state.templateUpdateBehavior}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    templateUpdateBehavior: e.target
                      .value as TemplateUpdateBehavior,
                  }))
                }
                aria-label="Template update behavior"
              >
                {UPDATE_BEHAVIOR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="max-w-xs text-right text-xs leading-snug text-slate-600">
                {DELTA_HELPER_ONE_LINE[state.templateUpdateBehavior]}
              </p>
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
