import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";

import { SETTINGS_TABLE_SELECT_CLASS } from "../constants/memberRoles";
import {
  ControlPlaneToggleShell,
  SettingsPageHeader,
  SettingsRow,
  SettingsSection,
} from "../components/ui";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input/Input";
import { Switch } from "@/components/ui/form/Switch";


export type GovernanceLevel = "execution" | "structured" | "governed";

export type PolicyEngineState = {
  defaultGovernanceLevel: GovernanceLevel;
  strictStateEnforcement: boolean;
  requireMultiLevelApprovals: boolean;
  maxRecycleLimit: number;
};

const GOVERNANCE_OPTIONS: { value: GovernanceLevel; label: string }[] = [
  { value: "execution", label: "EXECUTION (Simple)" },
  { value: "structured", label: "STRUCTURED (Standard)" },
  { value: "governed", label: "GOVERNED (Strict PMBOK)" },
];

const INITIAL: PolicyEngineState = {
  defaultGovernanceLevel: "structured",
  strictStateEnforcement: true,
  requireMultiLevelApprovals: false,
  maxRecycleLimit: 3,
};

function clampRecycleLimit(n: number): number {
  const rounded = Math.round(Number(n));
  if (Number.isNaN(rounded)) return 1;
  return Math.min(10, Math.max(1, rounded));
}

function policyEquals(a: PolicyEngineState, b: PolicyEngineState): boolean {
  return (
    a.defaultGovernanceLevel === b.defaultGovernanceLevel &&
    a.strictStateEnforcement === b.strictStateEnforcement &&
    a.requireMultiLevelApprovals === b.requireMultiLevelApprovals &&
    a.maxRecycleLimit === b.maxRecycleLimit
  );
}

export default function PolicyEngineSettings(): ReactElement {
  const [state, setState] = useState<PolicyEngineState>(INITIAL);
  const [saved, setSaved] = useState<PolicyEngineState>(INITIAL);
  const [recycleDraft, setRecycleDraft] = useState(() =>
    String(INITIAL.maxRecycleLimit),
  );

  useEffect(() => {
    setRecycleDraft(String(saved.maxRecycleLimit));
  }, [saved]);

  const dirty = useMemo(() => !policyEquals(state, saved), [state, saved]);

  const handleSave = useCallback(() => {
    setSaved({ ...state });
  }, [state]);

  return (
    <div data-settings-policy-engine>
      <SettingsPageHeader
        title="Policy Engine"
        description="Configure global governance rules, state enforcement, and phase gate behaviors."
      />

      <SettingsSection title="Global Enforcement">
        <SettingsRow
          variant="system"
          label="Default Governance Level"
          description="The default rigor applied to new projects when a template does not specify one."
          badge="Core"
          badgeTone="amber"
          control={
            <select
              className={SETTINGS_TABLE_SELECT_CLASS}
              value={state.defaultGovernanceLevel}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  defaultGovernanceLevel: e.target.value as GovernanceLevel,
                }))
              }
              aria-label="Default governance level"
            >
              {GOVERNANCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          }
        />
        <SettingsRow
          variant="system"
          label="Strict State Enforcement"
          description="Prevent manual task state changes when the parent phase is locked or the project is on hold."
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="policy-strict-state"
                checked={state.strictStateEnforcement}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    strictStateEnforcement: e.target.checked,
                  }))
                }
              />
            </ControlPlaneToggleShell>
          }
        />
      </SettingsSection>

      <SettingsSection title="Phase Gate Policies">
        <SettingsRow
          variant="system"
          label="Require Multi-Level Approvals"
          description="Require both Project Manager and executive sponsor approval for GO decisions."
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="policy-multi-approvals"
                checked={state.requireMultiLevelApprovals}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    requireMultiLevelApprovals: e.target.checked,
                  }))
                }
              />
            </ControlPlaneToggleShell>
          }
        />
        <SettingsRow
          variant="system"
          label="Maximum Recycle Limit"
          description="Number of RECYCLE outcomes allowed before automatic governance review is required."
          control={
            <div className="inline-flex rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
              <Input
                type="number"
                min={1}
                max={10}
                step={1}
                inputMode="numeric"
                className="w-24 border-0 bg-transparent text-right tabular-nums shadow-none focus-visible:ring-0"
                value={recycleDraft}
                onChange={(e) => {
                  const v = e.target.value;
                  setRecycleDraft(v);
                  if (v.trim() === "") return;
                  const n = parseInt(v, 10);
                  if (!Number.isNaN(n)) {
                    setState((s) => ({
                      ...s,
                      maxRecycleLimit: clampRecycleLimit(n),
                    }));
                  }
                }}
                onBlur={(e) => {
                  const raw = e.target.value.trim();
                  setState((s) => {
                    if (raw === "") {
                      const c = clampRecycleLimit(s.maxRecycleLimit);
                      setRecycleDraft(String(c));
                      return { ...s, maxRecycleLimit: c };
                    }
                    const n = parseInt(raw, 10);
                    const c = clampRecycleLimit(
                      Number.isNaN(n) ? s.maxRecycleLimit : n,
                    );
                    setRecycleDraft(String(c));
                    return { ...s, maxRecycleLimit: c };
                  });
                }}
                aria-label="Maximum recycle limit"
              />
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
