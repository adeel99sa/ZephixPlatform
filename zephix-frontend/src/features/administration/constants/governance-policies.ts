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
    tier: 2,
    methodologies: ["waterfall", "hybrid"],
    pmbok: "PMBOK 8: Governance domain — Focus Areas (phase gates)",
  },
  "scope-change-control": {
    displayName: "Scope change control",
    description: "New tasks after planning phase require approval.",
    tier: 2,
    methodologies: ["waterfall", "hybrid"],
    pmbok: "PMBOK 8: Governance + Scope domains — Integrated Change Control",
  },
  "task-completion-signoff": {
    displayName: "Task completion sign-off",
    description: "Tasks marked Done require reviewer confirmation.",
    tier: 2,
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
    tier: 2,
    methodologies: ["waterfall", "hybrid"],
    pmbok: "PMBOK 8: Governance domain — evidence-based gates",
  },
  "mandatory-fields": {
    displayName: "Mandatory fields",
    description: "Required fields must be filled before task leaves To Do.",
    tier: 1,
    methodologies: ["waterfall", "agile", "kanban", "hybrid", "scrum"],
    pmbok: "PMBOK 8: Governance domain — data governance",
  },
};

const CANONICAL_METHODOLOGY: Record<string, string> = {
  scrum: "scrum",
  agile: "agile",
  kanban: "kanban",
  waterfall: "waterfall",
  hybrid: "hybrid",
};

/** First path segment of delivery/methodology strings (e.g. waterfall-v1 → waterfall). */
function methodologyHeadToken(raw: string): string {
  const normalized = raw.toLowerCase().replace(/_/g, "-").trim();
  if (!normalized) return "";
  return normalized.split("-")[0] ?? "";
}

function canonicalFromHead(head: string): string {
  if (!head) return "";
  const synonyms: Record<string, string> = {
    predictive: "waterfall",
    traditional: "waterfall",
  };
  const primary = synonyms[head] ?? head;
  return CANONICAL_METHODOLOGY[primary] ?? "custom";
}

/**
 * Normalizes template methodology for governance UI filtering.
 * Handles uppercase enums, underscores, and delivery slugs like `waterfall_v1`.
 */
export function resolveMethodologyKey(template: GovernanceTemplateMethodologySource): string {
  const m = (template.methodology ?? "").toString().trim();
  if (m) {
    const head = methodologyHeadToken(m);
    return canonicalFromHead(head);
  }
  const d = (template.deliveryMethod ?? "").toString().trim();
  if (!d) return "";
  const head = methodologyHeadToken(d);
  return canonicalFromHead(head);
}
