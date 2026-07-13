/** Minimal shape for methodology resolution (avoids circular imports). */
export type GovernanceTemplateMethodologySource = {
  methodology?: string | null;
  deliveryMethod?: string | null;
};

export type GovernancePolicyUiMeta = {
  displayName: string;
  description: string;
  methodologies: string[];
};

/**
 * Display-only metadata for classic template catalog codes.
 * Do NOT encode evaluability or "coming soon" here — that was the FE-GOV-1 lie.
 * W2 policies carry `isEvaluable` + `enforcementPoint` on the API payload.
 * Classic template codes without a payload field use `resolvePolicyArmedState`.
 */
export const POLICY_UI_META: Record<string, GovernancePolicyUiMeta> = {
  "scope-change-control": {
    displayName: "Integrated change control",
    description:
      "Task creation requires organization or workspace admin approval when this policy is active on the template.",
    methodologies: ["waterfall", "hybrid"],
  },
  "task-completion-signoff": {
    displayName: "Task completion sign-off",
    description: "Task must have an assignee before marking as Done.",
    methodologies: ["waterfall", "agile", "kanban", "hybrid", "scrum"],
  },
  "phase-gate-approval": {
    displayName: "Phase gate approval",
    description: "Phase advancement requires approval before the project can leave the phase.",
    methodologies: ["waterfall", "hybrid"],
  },
  "deliverable-doc-required": {
    displayName: "Deliverable document required",
    description: "Documents required before phase closure.",
    methodologies: ["waterfall", "hybrid"],
  },
  "wip-limits": {
    displayName: "WIP limits",
    description: "Maximum tasks in progress on the board.",
    methodologies: ["kanban", "agile", "scrum"],
  },
  "risk-threshold-alert": {
    displayName: "Risk threshold alert",
    description: "Advisory when project open-risk count exceeds threshold.",
    methodologies: ["waterfall", "agile", "kanban", "hybrid", "scrum"],
  },
  "budget-threshold": {
    displayName: "Budget threshold",
    description: "Budget governance when project costs exceed thresholds.",
    methodologies: ["waterfall", "hybrid"],
  },
  "schedule-tolerance": {
    displayName: "Schedule tolerance",
    description: "Schedule variance escalation.",
    methodologies: ["waterfall", "hybrid"],
  },
  "resource-capacity-governance": {
    displayName: "Resource capacity governance",
    description: "Warn or block when assignment exceeds assignee capacity.",
    methodologies: ["waterfall", "agile", "hybrid", "scrum"],
  },
};

/**
 * Classic / W2 codes that cannot evaluate until a supporting engine ships.
 * Mirrors backend NON_EVALUABLE_POLICY_CODES (GOV-FIX-B1). Prefer payload
 * `isEvaluable` when present; this map is the fallback for classic template rows.
 */
export const POLICY_NOT_ARMED_REQUIRES: Record<string, string> = {
  "risk-threshold-alert": "E14 risk engine",
  "resource-capacity-governance": "E7 capacity engine",
};

export type PolicyArmedState = {
  isEvaluable: boolean;
  /** Human engine name when not armed, e.g. "E14 risk engine". */
  requiresEngine: string | null;
  /** Runtime hook label when armed (from W2 payload). */
  enforcementPoint: string | null;
};

/**
 * Resolve honesty label for a policy row.
 * Prefer API `isEvaluable` / `enforcementPoint` (W2). Fall back for classic template catalog.
 */
export function resolvePolicyArmedState(policy: {
  code: string;
  isEvaluable?: boolean;
  enforcementPoint?: string | null;
}): PolicyArmedState {
  if (typeof policy.isEvaluable === "boolean") {
    if (policy.isEvaluable) {
      return {
        isEvaluable: true,
        requiresEngine: null,
        enforcementPoint: policy.enforcementPoint?.trim() || null,
      };
    }
    return {
      isEvaluable: false,
      requiresEngine:
        POLICY_NOT_ARMED_REQUIRES[policy.code] ??
        extractEngineHint(policy.enforcementPoint) ??
        "a supporting engine",
      enforcementPoint: policy.enforcementPoint?.trim() || null,
    };
  }

  const requires = POLICY_NOT_ARMED_REQUIRES[policy.code] ?? null;
  return {
    isEvaluable: requires == null,
    requiresEngine: requires,
    enforcementPoint: null,
  };
}

function extractEngineHint(enforcementPoint?: string | null): string | null {
  if (!enforcementPoint) return null;
  const m = enforcementPoint.match(/\b(E\d+\s+[^,(]+)/i);
  return m?.[1]?.trim() ?? null;
}

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
/** True when the rule is a roadmap stub (no enforcement toggle). */
export function governanceRuleHasRoadmap(
  ruleDefinition?: { roadmap?: string } | null,
): boolean {
  return Boolean(ruleDefinition?.roadmap);
}

export const GOVERNANCE_ROADMAP_BADGE_TOOLTIP =
  "This governance feature is on the roadmap — available Q3 2026";

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
