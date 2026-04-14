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
};

/** Display-only metadata; policy codes must match backend SYSTEM catalog (nine policies). */
export const POLICY_UI_META: Record<string, GovernancePolicyUiMeta> = {
  "scope-change-control": {
    displayName: "Integrated change control",
    description:
      "Task creation requires organization or workspace admin approval when this policy is active on the template.",
    tier: 1,
    methodologies: ["waterfall", "hybrid"],
  },
  "task-completion-signoff": {
    displayName: "Task completion sign-off",
    description: "Task must have an assignee before marking as Done.",
    tier: 1,
    methodologies: ["waterfall", "agile", "kanban", "hybrid", "scrum"],
  },
  "phase-gate-approval": {
    displayName: "Phase gate approval",
    description: "Phase advancement requires approval (enforcement wiring in a future release).",
    tier: 2,
    methodologies: ["waterfall", "hybrid"],
  },
  "deliverable-doc-required": {
    displayName: "Deliverable document required",
    description: "Documents required before phase closure (enforcement wiring in a future release).",
    tier: 2,
    methodologies: ["waterfall", "hybrid"],
  },
  "wip-limits": {
    displayName: "WIP limits",
    description: "Maximum tasks in progress (enforcement wiring in a future release).",
    tier: 2,
    methodologies: ["kanban", "agile", "scrum"],
  },
  "risk-threshold-alert": {
    displayName: "Risk threshold alert",
    description: "High-priority task count alert (enforcement wiring in a future release).",
    tier: 2,
    methodologies: ["waterfall", "agile", "kanban", "hybrid", "scrum"],
  },
  "budget-threshold": {
    displayName: "Budget threshold",
    description: "Budget governance when project costs exceed thresholds (coming soon).",
    tier: 3,
    methodologies: ["waterfall", "hybrid"],
  },
  "schedule-tolerance": {
    displayName: "Schedule tolerance",
    description: "Schedule variance escalation (coming soon).",
    tier: 3,
    methodologies: ["waterfall", "hybrid"],
  },
  "resource-capacity-governance": {
    displayName: "Resource capacity governance",
    description: "Resource allocation governance (coming soon).",
    tier: 3,
    methodologies: ["waterfall", "agile", "hybrid", "scrum"],
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
