import type { ReactElement } from "react";


import type { CoreTemplateDefinition } from "../templates/templateLibrarySeed";
import {
  APPROVER_ROLE_LABELS,
  ARTIFACT_LABELS,
  TAB_LABELS,
} from "../templates/templateLibrarySeed";

import { cn } from "@/lib/utils";

export type TemplateBuilderPreviewPanelProps = {
  template: CoreTemplateDefinition;
  className?: string;
};

function GovernanceBadge({
  level,
}: {
  level: CoreTemplateDefinition["governanceLevel"];
}): ReactElement {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
        level === "Execution" && "bg-slate-100 text-slate-800",
        level === "Structured" && "bg-amber-100 text-amber-950",
        level === "Governed" && "bg-amber-200/90 text-amber-950 ring-1 ring-amber-300/80",
      )}
    >
      {level}
    </span>
  );
}

export function TemplateBuilderPreviewPanel({
  template,
  className,
}: TemplateBuilderPreviewPanelProps): ReactElement {
  const isGoverned = template.governanceLevel === "Governed";
  const isAgile =
    template.methodology.toLowerCase().includes("agile") ||
    template.methodology.toLowerCase().includes("scrum") ||
    template.methodology.toLowerCase().includes("kanban");

  return (
    <aside
      data-settings-template-preview
      className={cn(
        "rounded-lg border border-slate-200 bg-slate-50/80 p-4 shadow-sm",
        className,
      )}
      aria-label="Template preview"
    >
      <h3 className="text-sm font-semibold text-slate-900">Preview</h3>
      <p className="mt-1 text-xs text-slate-500">
        What projects created from this template will inherit by default.
      </p>

      <div className="mt-4 space-y-4 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Governance
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <GovernanceBadge level={template.governanceLevel} />
            {template.multiLevelApprovals ? (
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
                Multi-level approvals
              </span>
            ) : null}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tabs
          </p>
          <ul className="mt-1 list-inside list-disc text-slate-700">
            {template.defaultTabs.map((k) => (
              <li key={k}>
                {TAB_LABELS[k]}{" "}
                <span className="text-xs text-slate-500">
                  ({template.tabRules[k] ?? "optional"})
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Statuses
          </p>
          <p className="mt-1 font-mono text-xs text-slate-800">
            {template.statuses.join(" → ")}
          </p>
        </div>

        {template.defaultFields.length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Fields
            </p>
            <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
              {template.defaultFields.map((fd) => (
                <li key={fd.id}>
                  {fd.label}{" "}
                  <span className="text-slate-500">({fd.presence})</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {template.phases.length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Phases
            </p>
            <ol className="mt-1 list-decimal list-inside text-xs text-slate-800">
              {template.phases.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
          </div>
        ) : null}

        {template.gates.length > 0 ? (
          <div
            className={cn(
              "rounded-md border border-dashed p-3",
              isGoverned
                ? "border-amber-300 bg-amber-50/50"
                : "border-slate-200 bg-white",
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Phase gates
            </p>
            <ul className="mt-2 space-y-1 text-xs text-slate-800">
              {template.gates.map((g) => (
                <li key={g.id}>
                  <span className="font-medium">{g.name}</span>
                  {g.required ? (
                    <span className="text-amber-800"> — required</span>
                  ) : (
                    <span className="text-slate-500"> — optional</span>
                  )}
                  <span className="block text-[11px] text-slate-600">
                    Approvers:{" "}
                    {g.approverRoles.map((r) => APPROVER_ROLE_LABELS[r]).join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            {isAgile
              ? "Agile-style template: fewer formal gates; emphasis on backlog and flow."
              : "No phase gates configured for this template."}
          </p>
        )}

        {template.artifacts.filter((a) => a.presence !== "hidden").length >
        0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Artifacts
            </p>
            <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
              {template.artifacts.map((a) => (
                <li key={a.key}>
                  {ARTIFACT_LABELS[a.key]}{" "}
                  <span className="text-slate-500">({a.presence})</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
