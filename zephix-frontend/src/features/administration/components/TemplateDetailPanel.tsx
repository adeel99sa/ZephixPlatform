import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import type { AdminTemplate } from "@/features/administration/api/administration.api";

/**
 * List payload from GET /admin/templates is the unified Template entity shape;
 * AdminTemplate in the API module is a minimal subset — we widen here for UI.
 */
export type TemplatePanelData = AdminTemplate & {
  methodology?: string | null;
  deliveryMethod?: string | null;
  description?: string | null;
  isActive?: boolean;
  phases?: Array<{
    name: string;
    description?: string;
    order: number;
    estimatedDurationDays?: number;
  }>;
  columnConfig?: Record<string, boolean> | null;
};

type GovernancePolicyDef = {
  id: string;
  name: string;
  description: string;
  tier: 1 | 2 | 3;
  methodologies: string[];
  pmbok: string;
};

const GOVERNANCE_POLICIES: GovernancePolicyDef[] = [
  {
    id: "phase-gate",
    name: "Phase gate approval",
    description:
      "Block phase advancement until current phase deliverables are reviewed and approved.",
    tier: 1,
    methodologies: ["waterfall", "hybrid"],
    pmbok: "PMBOK 8: Governance domain — Focus Areas (phase gates)",
  },
  {
    id: "scope-change",
    name: "Scope change control",
    description:
      "New tasks created after project moves past planning phase require approval.",
    tier: 1,
    methodologies: ["waterfall", "hybrid"],
    pmbok:
      "PMBOK 8: Governance + Scope domains — Integrated Change Control",
  },
  {
    id: "task-signoff",
    name: "Task completion sign-off",
    description:
      "Tasks marked Done require a reviewer to confirm before status change is final.",
    tier: 1,
    methodologies: ["waterfall", "agile", "kanban", "hybrid", "scrum"],
    pmbok: "PMBOK 8: Governance domain — Quality principle",
  },
  {
    id: "wip-limits",
    name: "WIP limits",
    description:
      "Maximum tasks in progress per assignee or per board column.",
    tier: 2,
    methodologies: ["kanban", "agile", "scrum"],
    pmbok: "PMBOK 8: Resources domain — flow governance",
  },
  {
    id: "risk-threshold",
    name: "Risk threshold alert",
    description:
      "Notify admin when high-priority task count exceeds configurable threshold.",
    tier: 2,
    methodologies: ["waterfall", "agile", "kanban", "hybrid", "scrum"],
    pmbok: "PMBOK 8: Risk domain — governance escalation",
  },
  {
    id: "budget-threshold",
    name: "Budget threshold",
    description:
      "Alert when project costs exceed percentage of allocated budget.",
    tier: 3,
    methodologies: ["waterfall", "hybrid"],
    pmbok: "PMBOK 8: Finance domain",
  },
  {
    id: "deliverable-doc",
    name: "Deliverable document required",
    description:
      "Phase cannot close without at least one attached document.",
    tier: 3,
    methodologies: ["waterfall", "hybrid"],
    pmbok: "PMBOK 8: Governance domain — evidence-based gates",
  },
  {
    id: "mandatory-fields",
    name: "Mandatory fields",
    description:
      "Certain fields must be filled before task leaves To Do status.",
    tier: 3,
    methodologies: ["waterfall", "agile", "kanban", "hybrid", "scrum"],
    pmbok: "PMBOK 8: Governance domain — data governance",
  },
];

function resolveMethodologyKey(template: TemplatePanelData): string {
  const m = (template.methodology ?? "").toString().toLowerCase().trim();
  if (m) return m;
  const d = (template.deliveryMethod ?? "").toString().toLowerCase().trim();
  const map: Record<string, string> = {
    scrum: "scrum",
    agile: "agile",
    kanban: "kanban",
    waterfall: "waterfall",
    hybrid: "hybrid",
  };
  return map[d] ?? "custom";
}

function policyAppliesToTemplate(
  policy: GovernancePolicyDef,
  template: TemplatePanelData,
): boolean {
  const key = resolveMethodologyKey(template);
  if (key === "custom") {
    return true;
  }
  return policy.methodologies.includes(key);
}

export interface TemplateDetailPanelProps {
  template: TemplatePanelData;
  onClose: () => void;
}

export function TemplateDetailPanel({
  template,
  onClose,
}: TemplateDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "governance" | "columns"
  >("overview");

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-slate-900/20"
        aria-hidden
        onClick={onClose}
      />

      <aside
        className="fixed top-0 right-0 z-40 h-full w-full max-w-[520px] overflow-y-auto border-l border-slate-200 bg-white shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-detail-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div className="min-w-0">
            <h2
              id="template-detail-title"
              className="text-lg font-semibold text-slate-900"
            >
              {template.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {resolveMethodologyKey(template) !== "custom" ? (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {resolveMethodologyKey(template)}
                </span>
              ) : null}
              {template.deliveryMethod ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {template.deliveryMethod}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-200">
          {(["overview", "governance", "columns"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 text-sm font-medium capitalize ${
                activeTab === tab
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === "overview" ? (
            <TemplateOverviewTab template={template} />
          ) : null}
          {activeTab === "governance" ? (
            <TemplateGovernanceTab template={template} />
          ) : null}
          {activeTab === "columns" ? (
            <TemplateColumnsTab template={template} />
          ) : null}
        </div>
      </aside>
    </>
  );
}

function TemplateOverviewTab({ template }: { template: TemplatePanelData }) {
  const phases = template.phases ?? [];
  const active =
    template.isActive !== undefined
      ? template.isActive
      : template.status !== "ARCHIVED";

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-medium text-slate-500">Description</div>
        <p className="mt-1 text-sm text-slate-700">
          {template.description?.trim()
            ? template.description
            : "No description"}
        </p>
      </div>
      <div>
        <div className="text-xs font-medium text-slate-500">Methodology</div>
        <p className="mt-1 text-sm capitalize text-slate-700">
          {resolveMethodologyKey(template)}
        </p>
      </div>
      <div>
        <div className="text-xs font-medium text-slate-500">Status</div>
        <div className="mt-1 flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              active ? "bg-green-500" : "bg-slate-300"
            }`}
          />
          <span className="text-sm text-slate-700">
            {active ? "Active" : "Inactive"}
          </span>
          {template.status ? (
            <span className="text-xs text-slate-500">
              ({template.status})
            </span>
          ) : null}
        </div>
      </div>
      {phases.length > 0 ? (
        <div>
          <div className="text-xs font-medium text-slate-500">Phases</div>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
            {phases
              .slice()
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((p, i) => (
                <li key={`${p.name}-${i}`}>
                  <span className="font-medium">{p.name}</span>
                  {p.description ? (
                    <span className="text-slate-500"> — {p.description}</span>
                  ) : null}
                </li>
              ))}
          </ol>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No phase list on this template.</p>
      )}
    </div>
  );
}

function TemplateGovernanceTab({ template }: { template: TemplatePanelData }) {
  const [enabledPolicies, setEnabledPolicies] = useState<Set<string>>(
    () => new Set(),
  );

  const togglePolicy = (policyId: string) => {
    setEnabledPolicies((prev) => {
      const next = new Set(prev);
      if (next.has(policyId)) next.delete(policyId);
      else next.add(policyId);
      return next;
    });
  };

  const relevantPolicies = GOVERNANCE_POLICIES.filter((p) =>
    policyAppliesToTemplate(p, template),
  );

  return (
    <div className="space-y-3">
      <p className="mb-2 text-xs text-slate-500">
        Configure governance policies for projects created from this template.
        Changes are local preview only — persistence ships in PR #137.
      </p>

      {relevantPolicies.map((policy) => (
        <div
          key={policy.id}
          className={`rounded-lg border p-3 ${
            policy.tier === 3
              ? "border-slate-100 bg-slate-50 opacity-80"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-800">
                  {policy.name}
                </span>
                {policy.tier === 2 ? (
                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                    Enforcement coming soon
                  </span>
                ) : null}
                {policy.tier === 3 ? (
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    Coming soon
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{policy.description}</p>
              <p className="mt-1 text-[10px] text-slate-400">{policy.pmbok}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {policy.methodologies.map((m) => (
                  <span
                    key={m}
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-600"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>

            {policy.tier <= 2 ? (
              <button
                type="button"
                role="switch"
                aria-checked={enabledPolicies.has(policy.id)}
                onClick={() => togglePolicy(policy.id)}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  enabledPolicies.has(policy.id) ? "bg-blue-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    enabledPolicies.has(policy.id)
                      ? "translate-x-4"
                      : "translate-x-0.5"
                  }`}
                />
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function TemplateColumnsTab({ template }: { template: TemplatePanelData }) {
  const cfg = template.columnConfig;
  const keys = cfg ? Object.keys(cfg).filter((k) => cfg[k]) : [];

  return (
    <div className="space-y-3 py-4 text-center text-sm text-slate-500">
      <p>Column configuration for this template.</p>
      {keys.length > 0 ? (
        <div className="mx-auto max-w-sm text-left">
          <p className="text-xs font-medium text-slate-500">
            Enabled columns (from API)
          </p>
          <ul className="mt-2 list-inside list-disc text-xs text-slate-600">
            {keys.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-slate-400">
          No column defaults on this template row. Defaults can be edited when
          authoring the template in Template Center.
        </p>
      )}
    </div>
  );
}
