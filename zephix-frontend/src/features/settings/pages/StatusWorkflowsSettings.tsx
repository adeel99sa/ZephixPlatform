import { useCallback, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { BookOpen } from "lucide-react";

import {
  SettingsPageHeader,
  SettingsRow,
  SettingsSection,
} from "../components/ui";

import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/form/Switch";
import { cn } from "@/lib/utils";

const TASK_WORKFLOW = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;
const RISK_WORKFLOW = [
  "IDENTIFIED",
  "MITIGATING",
  "REALIZED",
  "CLOSED",
] as const;

export type StatusWorkflowsState = {
  enforceLinearTransitions: boolean;
};

const INITIAL: StatusWorkflowsState = {
  enforceLinearTransitions: false,
};

function stateEquals(
  a: StatusWorkflowsState,
  b: StatusWorkflowsState,
): boolean {
  return a.enforceLinearTransitions === b.enforceLinearTransitions;
}

function WorkflowChain({ steps }: { steps: readonly string[] }): ReactElement {
  return (
    <div
      className="flex flex-wrap items-center gap-x-1 gap-y-2 text-xs font-mono"
      aria-label="Workflow states in order (reference only)"
    >
      {steps.map((s, i) => (
        <span key={`${s}-${i}`} className="inline-flex items-center gap-1">
          {i > 0 ? (
            <span className="select-none text-slate-400" aria-hidden>
              →
            </span>
          ) : null}
          <span className="rounded-md border border-dashed border-slate-300 bg-white/60 px-2.5 py-1.5 font-medium text-slate-700">
            {s}
          </span>
        </span>
      ))}
    </div>
  );
}

export default function StatusWorkflowsSettings(): ReactElement {
  const [state, setState] = useState<StatusWorkflowsState>(INITIAL);
  const [saved, setSaved] = useState<StatusWorkflowsState>(INITIAL);

  const dirty = useMemo(() => !stateEquals(state, saved), [state, saved]);

  const handleSave = useCallback(() => {
    setSaved({ ...state });
  }, [state]);

  return (
    <div data-settings-status-workflows>
      <SettingsPageHeader
        title="Status Workflows"
        description="Define lifecycle states for tasks, risks, and issues. Visual reference only — transitions are not enforced in this UI."
      />

      <SettingsSection title="Global rules">
        <SettingsRow
          label="Enforce Linear Transitions"
          description="Require tasks to move sequentially through statuses. Runtime enforcement is handled by the work engine, not this screen."
          control={
            <Switch
              id="status-linear"
              checked={state.enforceLinearTransitions}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  enforceLinearTransitions: e.target.checked,
                }))
              }
            />
          }
        />
      </SettingsSection>

      <SettingsSection title="Workflow definitions">
        <p className="mb-4 text-sm text-slate-600">
          Reference maps for documentation — not a drag-and-drop workflow editor.
          Paths are not validated or executed here.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <article
            className={cn(
              "rounded-lg border border-dashed border-slate-300 bg-slate-50/90 p-4",
              "ring-1 ring-slate-200/60",
            )}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Reference map
            </div>
            <h3 className="mt-2 text-sm font-semibold text-slate-900">Task workflow</h3>
            <p className="mt-1 text-xs text-slate-500">Default task lifecycle</p>
            <div className="mt-4 rounded-md border border-dashed border-slate-200 bg-slate-100/50 p-3">
              <WorkflowChain steps={TASK_WORKFLOW} />
            </div>
          </article>
          <article
            className={cn(
              "rounded-lg border border-dashed border-slate-300 bg-slate-50/90 p-4",
              "ring-1 ring-slate-200/60",
            )}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Reference map
            </div>
            <h3 className="mt-2 text-sm font-semibold text-slate-900">Risk workflow</h3>
            <p className="mt-1 text-xs text-slate-500">Risk register lifecycle</p>
            <div className="mt-4 rounded-md border border-dashed border-slate-200 bg-slate-100/50 p-3">
              <WorkflowChain steps={RISK_WORKFLOW} />
            </div>
          </article>
        </div>
      </SettingsSection>

      <footer className="mt-10 flex justify-end border-t border-slate-200 pt-6">
        <Button type="button" disabled={!dirty} onClick={handleSave}>
          Save Changes
        </Button>
      </footer>
    </div>
  );
}
