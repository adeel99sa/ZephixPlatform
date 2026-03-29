import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";

import {
  ControlPlaneToggleShell,
  SettingsPageHeader,
  SettingsRow,
  SettingsSection,
} from "../components/ui";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input/Input";
import { Switch } from "@/components/ui/form/Switch";


export type CapacityRulesState = {
  maxConcurrentCriticalTasks: number;
  overAllocationWarningPct: number;
  autoFlagDependencyConflicts: boolean;
};

const INITIAL: CapacityRulesState = {
  maxConcurrentCriticalTasks: 3,
  overAllocationWarningPct: 90,
  autoFlagDependencyConflicts: true,
};

/** Mirrors Policy Engine `clampRecycleLimit`: integers only, NaN → floor of range. */
function clampCriticalTaskCount(n: number): number {
  const rounded = Math.round(Number(n));
  if (Number.isNaN(rounded)) return 1;
  return Math.min(10, Math.max(1, rounded));
}

/** Same validation pattern as max concurrent tasks; range 1–200. */
function clampOverAllocationPct(n: number): number {
  const rounded = Math.round(Number(n));
  if (Number.isNaN(rounded)) return 1;
  return Math.min(200, Math.max(1, rounded));
}

function capacityEquals(a: CapacityRulesState, b: CapacityRulesState): boolean {
  return (
    a.maxConcurrentCriticalTasks === b.maxConcurrentCriticalTasks &&
    a.overAllocationWarningPct === b.overAllocationWarningPct &&
    a.autoFlagDependencyConflicts === b.autoFlagDependencyConflicts
  );
}

export default function CapacityRulesSettings(): ReactElement {
  const [state, setState] = useState<CapacityRulesState>(INITIAL);
  const [saved, setSaved] = useState<CapacityRulesState>(INITIAL);
  const [criticalDraft, setCriticalDraft] = useState(() =>
    String(INITIAL.maxConcurrentCriticalTasks),
  );
  const [pctDraft, setPctDraft] = useState(() =>
    String(INITIAL.overAllocationWarningPct),
  );

  useEffect(() => {
    setCriticalDraft(String(saved.maxConcurrentCriticalTasks));
    setPctDraft(String(saved.overAllocationWarningPct));
  }, [saved]);

  const dirty = useMemo(() => !capacityEquals(state, saved), [state, saved]);

  const handleSave = useCallback(() => {
    setSaved({ ...state });
  }, [state]);

  return (
    <div data-settings-capacity-rules>
      <SettingsPageHeader
        title="Capacity Rules"
        description="Configure workload limits and automated conflict resolution for the Capacity Engine."
      />

      <SettingsSection title="Workload Limits">
        <SettingsRow
          variant="system"
          label="Max Concurrent Critical Tasks"
          description="Maximum number of critical-path tasks assigned to one user at the same time."
          control={
            <ControlPlaneToggleShell className="min-w-[5.5rem]">
              <Input
                type="number"
                min={1}
                max={10}
                step={1}
                inputMode="numeric"
                className="w-14 border-0 bg-transparent text-right tabular-nums shadow-none focus-visible:ring-0"
                value={criticalDraft}
                onChange={(e) => {
                  const v = e.target.value;
                  setCriticalDraft(v);
                  if (v.trim() === "") return;
                  const n = parseInt(v, 10);
                  if (!Number.isNaN(n)) {
                    setState((s) => ({
                      ...s,
                      maxConcurrentCriticalTasks: clampCriticalTaskCount(n),
                    }));
                  }
                }}
                onBlur={(e) => {
                  const raw = e.target.value.trim();
                  setState((s) => {
                    if (raw === "") {
                      const c = clampCriticalTaskCount(s.maxConcurrentCriticalTasks);
                      setCriticalDraft(String(c));
                      return { ...s, maxConcurrentCriticalTasks: c };
                    }
                    const n = parseInt(raw, 10);
                    const c = clampCriticalTaskCount(
                      Number.isNaN(n) ? s.maxConcurrentCriticalTasks : n,
                    );
                    setCriticalDraft(String(c));
                    return { ...s, maxConcurrentCriticalTasks: c };
                  });
                }}
                aria-label="Max concurrent critical tasks"
              />
            </ControlPlaneToggleShell>
          }
        />
        <SettingsRow
          variant="system"
          label="Over-allocation Warning Threshold"
          description="Trigger warnings when a user's allocated hours exceed this percentage of weekly capacity."
          control={
            <ControlPlaneToggleShell className="min-w-[5.5rem]">
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  max={200}
                  step={1}
                  inputMode="numeric"
                  className="w-16 border-0 bg-transparent text-right tabular-nums shadow-none focus-visible:ring-0"
                  value={pctDraft}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPctDraft(v);
                    if (v.trim() === "") return;
                    const n = parseInt(v, 10);
                    if (!Number.isNaN(n)) {
                      setState((s) => ({
                        ...s,
                        overAllocationWarningPct: clampOverAllocationPct(n),
                      }));
                    }
                  }}
                  onBlur={(e) => {
                    const raw = e.target.value.trim();
                    setState((s) => {
                      if (raw === "") {
                        const c = clampOverAllocationPct(s.overAllocationWarningPct);
                        setPctDraft(String(c));
                        return { ...s, overAllocationWarningPct: c };
                      }
                      const n = parseInt(raw, 10);
                      const c = clampOverAllocationPct(
                        Number.isNaN(n) ? s.overAllocationWarningPct : n,
                      );
                      setPctDraft(String(c));
                      return { ...s, overAllocationWarningPct: c };
                    });
                  }}
                  aria-label="Over-allocation warning threshold percent"
                />
                <span className="text-sm font-medium text-slate-600">%</span>
              </div>
            </ControlPlaneToggleShell>
          }
        />
      </SettingsSection>

      <SettingsSection title="Conflict Resolution">
        <SettingsRow
          variant="system"
          label="Auto-flag Dependency Conflicts"
          description="Automatically flag downstream tasks when an upstream dependency is delayed."
          control={
            <ControlPlaneToggleShell>
              <Switch
                id="capacity-auto-flag"
                checked={state.autoFlagDependencyConflicts}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    autoFlagDependencyConflicts: e.target.checked,
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
