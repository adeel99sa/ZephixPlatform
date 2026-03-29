import { useCallback, useMemo, useState, type ReactElement } from "react";

import {
  SettingsPageHeader,
  SettingsRow,
  SettingsSection,
} from "../components/ui";
import { SETTINGS_TABLE_SELECT_CLASS } from "../constants/memberRoles";

import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/form/Switch";
import { cn } from "@/lib/utils";

export type MatrixDimensions = "3x3" | "5x5";

export type RiskMatrixState = {
  matrixDimensions: MatrixDimensions;
  financialImpactTracking: boolean;
  autoEscalateCriticalRisks: boolean;
};

const INITIAL: RiskMatrixState = {
  matrixDimensions: "5x5",
  financialImpactTracking: true,
  autoEscalateCriticalRisks: true,
};

const DIMENSION_OPTIONS: { value: MatrixDimensions; label: string }[] = [
  { value: "3x3", label: "3×3 — compact" },
  { value: "5x5", label: "5×5 — detailed" },
];

function matrixEquals(a: RiskMatrixState, b: RiskMatrixState): boolean {
  return (
    a.matrixDimensions === b.matrixDimensions &&
    a.financialImpactTracking === b.financialImpactTracking &&
    a.autoEscalateCriticalRisks === b.autoEscalateCriticalRisks
  );
}

export default function RiskMatrixSettings(): ReactElement {
  const [state, setState] = useState<RiskMatrixState>(INITIAL);
  const [saved, setSaved] = useState<RiskMatrixState>(INITIAL);

  const dirty = useMemo(() => !matrixEquals(state, saved), [state, saved]);

  const handleSave = useCallback(() => {
    setSaved({ ...state });
  }, [state]);

  return (
    <div data-settings-risk-matrix>
      <SettingsPageHeader
        title="Risk Matrix"
        description="Configure the probability and impact model used by the Risk Engine. Scores and thresholds are not calculated on this page."
      />

      <SettingsSection title="Scoring model">
        <p className="mb-4 text-sm text-slate-600">
          Defines how exposure will be derived when scoring runs in the Risk
          Engine — not the numeric result of any single risk.
        </p>
        <SettingsRow
          label="Matrix dimensions"
          description="Grid used when the engine combines probability and impact. Larger grids are common in enterprise risk practice; this is configuration only, not a methodology endorsement."
          control={
            <select
              className={cn(SETTINGS_TABLE_SELECT_CLASS, "h-10 min-w-[14rem] max-w-xs")}
              value={state.matrixDimensions}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  matrixDimensions: e.target.value as MatrixDimensions,
                }))
              }
              aria-label="Matrix dimensions"
            >
              {DIMENSION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          }
        />
        <SettingsRow
          label="Financial impact tracking"
          description="Require monetary estimates for high severity risks."
          control={
            <Switch
              id="risk-financial-impact"
              checked={state.financialImpactTracking}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  financialImpactTracking: e.target.checked,
                }))
              }
            />
          }
        />
      </SettingsSection>

      <SettingsSection title="Automation">
        <SettingsRow
          label="Auto-escalate critical risks"
          description="Notify governance leads when a risk reaches critical threshold."
          control={
            <Switch
              id="risk-auto-escalate"
              checked={state.autoEscalateCriticalRisks}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  autoEscalateCriticalRisks: e.target.checked,
                }))
              }
            />
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
