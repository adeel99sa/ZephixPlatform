/** Minimal shape for methodology resolution (avoids circular imports). */
export type GovernanceTemplateMethodologySource = {
  methodology?: string | null;
  deliveryMethod?: string | null;
};

export type GovernancePolicyUiMeta = {
  displayName: string;
  description: string;
  tier: 1 | 2 | 3;
  methodologies: string[];
  pmbok: string;
};

/** Display-only metadata; policy codes must match backend SYSTEM catalog. */
export const POLICY_UI_META: Record<string, GovernancePolicyUiMeta> = {
  "phase-gate-approval": {
    displayName: "Phase gate approval",
    description:
      "Block phase advancement until deliverables reviewed and approved.",
    tier: 1,
    methodologies: ["waterfall", "hybrid"],
    pmbok: "PMBOK 8: Governance domain — Focus Areas (phase gates)",
  },
  "scope-change-control": {
    displayName: "Scope change control",
    description: "New tasks after planning phase require approval.",
    tier: 1,
    methodologies: ["waterfall", "hybrid"],
    pmbok: "PMBOK 8: Governance + Scope domains — Integrated Change Control",
  },
  "task-completion-signoff": {
    displayName: "Task completion sign-off",
    description: "Tasks marked Done require reviewer confirmation.",
    tier: 1,
    methodologies: ["waterfall", "agile", "kanban", "hybrid", "scrum"],
    pmbok: "PMBOK 8: Governance domain — Quality principle",
  },
  "wip-limits": {
    displayName: "WIP limits",
    description: "Maximum tasks in progress per assignee or column.",
    tier: 2,
    methodologies: ["kanban", "agile", "scrum"],
    pmbok: "PMBOK 8: Resources domain — flow governance",
  },
  "risk-threshold-alert": {
    displayName: "Risk threshold alert",
    description: "Alert when high-priority task count exceeds threshold.",
    tier: 2,
    methodologies: ["waterfall", "agile", "kanban", "hybrid", "scrum"],
    pmbok: "PMBOK 8: Risk domain — governance escalation",
  },
  "budget-threshold": {
    displayName: "Budget threshold",
    description: "Alert when project costs exceed percentage of budget.",
    tier: 3,
    methodologies: ["waterfall", "hybrid"],
    pmbok: "PMBOK 8: Finance domain",
  },
  "deliverable-doc-required": {
    displayName: "Deliverable document required",
    description: "Phase cannot close without attached documents.",
    tier: 3,
    methodologies: ["waterfall", "hybrid"],
    pmbok: "PMBOK 8: Governance domain — evidence-based gates",
  },
  "mandatory-fields": {
    displayName: "Mandatory fields",
    description: "Required fields must be filled before task leaves To Do.",
    tier: 3,
    methodologies: ["waterfall", "agile", "kanban", "hybrid", "scrum"],
    pmbok: "PMBOK 8: Governance domain — data governance",
  },
};

export function resolveMethodologyKey(template: GovernanceTemplateMethodologySource): string {
  const m = (template.methodology ?? "")
    .toString()
    .toLowerCase()
    .replace(/_/g, "-")
    .trim();
  if (m) return m;
  const d = (template.deliveryMethod ?? "")
    .toString()
    .toLowerCase()
    .replace(/_/g, "-")
    .trim();
  const map: Record<string, string> = {
    scrum: "scrum",
    agile: "agile",
    kanban: "kanban",
    waterfall: "waterfall",
    hybrid: "hybrid",
  };
  if (!d) return "";
  return map[d] ?? "custom";
}
