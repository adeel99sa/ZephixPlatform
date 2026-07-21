/**
 * W2 governance policy catalog: 9 codes (7 INSERT platform.gate.*, 2 UPDATE promotions).
 * Bundle mapping governs: which complexity mode enables each policy by default.
 * Severity mapping: effective severity when enabled via a given bundle mode.
 * Resolution: explicit workspace_policies row → bundle default → DISABLED.
 *
 * SEVERITY VOCABULARY — TWO LAYERS, NEVER COMPARE ACROSS THEM:
 *   catalog layer  (governance_rules.rule_definition.severity): ERROR | WARNING
 *     Rule-engine vocabulary. Stored in rule_definition JSON. Shared across all
 *     rule types; pre-dates W2. Do not use these values in enforcement logic.
 *   enforcement layer (PolicyView.severityEffective):           BLOCK | WARN | null
 *     Computed per complexity mode via bundleSeverity below. This is what the
 *     admin API surfaces and what Cursor's UI renders. A catalog ERROR may
 *     resolve to WARN under a lower complexity mode — they are not equivalent.
 */

export const W2_POLICY_CODES = [
  'platform.gate.init-to-plan',
  'platform.gate.plan-to-exec',
  'platform.gate.exec-to-monitor',
  'platform.gate.monitor-to-closure',
  'platform.gate.closure-to-closed',
  'platform.gate.evidence-required',
  'platform.gate.closeout-remediation-owner',
  'risk-threshold-alert',
  'resource-capacity-governance',
] as const;

export type W2PolicyCode = (typeof W2_POLICY_CODES)[number];

/**
 * AGILE-1 (R4): the canonical set of phase-gate keys a template phase (or a
 * cloned project's gate definition) may carry — the `platform.gate.*` subset of
 * the W2 catalog. A `gateKey` outside this set resolves to no governance policy:
 * it would arm a gate that is invisible to the W2 admin surface and can never
 * enforce. Both create paths (instantiate + clone) reject unknown keys loudly
 * rather than write a cosmetic, ungoverned gate. Reconcile, never dangle.
 */
export const KNOWN_GATE_KEYS: ReadonlySet<string> = new Set(
  W2_POLICY_CODES.filter((c) => c.startsWith('platform.gate.')),
);

/** True when `gateKey` maps to a real `platform.gate.*` W2 policy code. */
export function isKnownGateKey(gateKey: string): boolean {
  return KNOWN_GATE_KEYS.has(gateKey);
}

/**
 * GOV-FIX-B1 (1.0): codes that CANNOT be evaluated because their required input
 * data is never injected onto the entity the rule engine sees. These are the
 * SILENT-ALLOW-ON-MISSING-FIELD risks — the engine must SKIP them entirely (a
 * rule that cannot evaluate does not run), and the catalog reports
 * `isEvaluable:false`. They return only when E7 (capacity)/E14 (risk) ship the
 * real data source. Do NOT "fix" by injecting a default — a default is a guess.
 *   - risk-threshold-alert:          needs `openRiskCount`  (E14, not built)
 *   - resource-capacity-governance:  needs `activeTaskCount` (E7, not built)
 */
export const NON_EVALUABLE_POLICY_CODES: ReadonlySet<string> = new Set([
  'risk-threshold-alert',
  'resource-capacity-governance',
]);

/** True when a policy code has a real data source and may be evaluated. */
export function isPolicyEvaluable(code: string): boolean {
  return !NON_EVALUABLE_POLICY_CODES.has(code);
}

/**
 * GOV-FIX-B1 (1.1): the runtime event each policy hooks — the "enforcementPoint"
 * the self-describing catalog surfaces so the UI can say WHERE a policy acts.
 */
export const POLICY_ENFORCEMENT_POINT: Record<W2PolicyCode, string> = {
  'platform.gate.init-to-plan': 'Phase transition: Initiation → Planning',
  'platform.gate.plan-to-exec': 'Phase transition: Planning → Execution',
  'platform.gate.exec-to-monitor': 'Phase transition: Execution → Monitoring',
  'platform.gate.monitor-to-closure': 'Phase transition: Monitoring → Closure',
  'platform.gate.closure-to-closed': 'Phase transition: Closure → Closed',
  'platform.gate.evidence-required': 'Phase gate submission (evidence required)',
  'platform.gate.closeout-remediation-owner':
    'Closeout gate: open risks require a remediation owner',
  'risk-threshold-alert':
    'Task status change — needs openRiskCount (E14 risk engine, not yet supplied)',
  'resource-capacity-governance':
    'Task → In Progress — needs activeTaskCount (E7 capacity engine, not yet supplied)',
};

/**
 * GOV-BUILD WAVE-1 Unit 5: the plain-language "When" clause for the admin
 * sentence view (When → Where → Then → Who can release it). Composed
 * SERVER-SIDE — the frontend must never build policy sentences; this is the one
 * source of truth for policy language. `{value}` / `{unit}` are interpolated
 * from the effective threshold for the two param-bearing policies. A policy with
 * no sentence form would map to null here (none do today — all nine have one).
 */
export const POLICY_WHEN_TEXT: Record<W2PolicyCode, string> = {
  'platform.gate.init-to-plan':
    'When a project tries to leave Initiation, a gate review is required before Planning.',
  'platform.gate.plan-to-exec':
    'When a project tries to enter Execution, a gate review with evidence is required.',
  'platform.gate.exec-to-monitor':
    'When a project tries to leave Execution, milestone deliverables must be signed off.',
  'platform.gate.monitor-to-closure':
    'When a project tries to enter Closure, all risks must be Closed or Accepted.',
  'platform.gate.closure-to-closed':
    'When a project tries to close, final sign-off with evidence and a risk-owner check is required.',
  'platform.gate.evidence-required':
    'When a gate is submitted, at least one evidence document is required.',
  'platform.gate.closeout-remediation-owner':
    'When a project tries to close, every open risk must have an owner assigned.',
  'risk-threshold-alert':
    "When a project's open-risk count exceeds {value} {unit}, an advisory warning is raised.",
  'resource-capacity-governance':
    'When an assignee would exceed {value} {unit}, a capacity warning is raised.',
};

/**
 * Human reason a NON_EVALUABLE policy cannot run — names the missing input
 * engine. Surfaced as `stateReason` for state NOT_EVALUABLE so the admin sees
 * "cannot run it" (our gap), never confused with "turned off" (their choice).
 */
export const NON_EVALUABLE_REASON: Record<string, string> = {
  'risk-threshold-alert': 'Risk engine not enabled',
  'resource-capacity-governance': 'Capacity engine not enabled',
};

export interface PolicyBundleDefault {
  LEAN: boolean;
  STANDARD: boolean;
  GOVERNED: boolean;
}

export interface PolicyBundleSeverity {
  STANDARD?: 'WARN' | 'BLOCK';
  GOVERNED?: 'WARN' | 'BLOCK';
}

/**
 * GOV-BUILD WAVE-1 Unit 6: declared schema for a single tunable threshold on a
 * W2 policy. This is the allow-list source of truth — the PUT that writes
 * `workspace_policies.params` accepts ONLY declared keys, in-type, in-range
 * (see coercePolicyParam / assertPolicyParamsValid). Declaring a param here does
 * NOT by itself make it editable in the admin contract; see `readAtDecisionTime`.
 */
export interface PolicyParamMeta {
  /** JSON key stored in workspace_policies.params (snake_case). */
  key: string;
  /** Human label for the admin sentence view. */
  label: string;
  /** Only numeric thresholds exist today; kept explicit for future types. */
  type: 'number';
  /** Display unit, e.g. 'tasks' | 'risks' | '%'. null when unitless. */
  unit: string | null;
  min: number | null;
  max: number | null;
  /** Fallback used at decision time when no row/param is present (the no-op path). */
  default: number;
  /**
   * True when a live evaluator reads this param from workspace_policies.params
   * at decision time (Unit 6 wired it). The admin `editable` flag is
   * `isPolicyEvaluable(code) && readAtDecisionTime` — capacity's threshold is
   * wired (readAtDecisionTime:true) but its code stays NON_EVALUABLE until E7
   * ships, so editable is false today and flips true automatically when the
   * engine lands. Param-readability and gate-evaluability are distinct concepts
   * (see docs/known-debt); we deliberately do not expose that split to users —
   * a customer must never see an editable number on a card the engine can't act
   * on. Hence editable stays aligned with `state`.
   */
  readAtDecisionTime: boolean;
}

export interface PolicyMeta {
  name: string;
  description: string;
  scope: 'PHASE_GATE' | 'PROJECT' | 'TASK';
  bundleDefaults: PolicyBundleDefault;
  bundleSeverity: PolicyBundleSeverity;
  /**
   * Tunable thresholds for this policy. Empty/absent for the boolean gate
   * policies (they carry no number). Only `resource-capacity-governance` and
   * `risk-threshold-alert` — the two PROJECT-scope threshold policies — declare
   * a param. Both are NON_EVALUABLE today, so both surface editable:false.
   */
  params?: PolicyParamMeta[];
}

/**
 * GATE-MODE-COHERENCE-1 — the catalog must not claim a gate is advisory when
 * the enforcement path hard-refuses.
 *
 * TRUTH (proven live, SESSION-READY-1): the five phase-TRANSITION gate policies
 * (platform.gate.{init-to-plan,plan-to-exec,exec-to-monitor,monitor-to-closure,
 * closure-to-closed}) are enforced ONLY by armed gate definitions —
 * `isPhaseGateBlocking` refuses task→DONE whenever the phase has an ACTIVE gate
 * with no APPROVED submission, in EVERY mode. That severity is BLOCK, not WARN,
 * and it is NOT mode-variable. These codes are NEVER consulted via
 * isPolicyActive, so bundleDefaults/bundleSeverity here are display-only for the
 * five transition gates — correcting them changes the console, not enforcement.
 *
 * WHERE MODE ACTUALLY MATTERS: whether a project HAS gates is decided at
 * instantiation — LEAN arms none (guardrails, not gates; see
 * templates-instantiate-v51). So these five resolve BLOCK in STANDARD/GOVERNED
 * (modes that arm) and are not-enabled in LEAN (bundleDefaults.LEAN:false).
 *
 * The two CRITERIA policies (evidence-required, closeout-remediation-owner) ARE
 * genuinely mode-gated via isPolicyActive — their GOVERNED-only mapping is
 * honest and unchanged: mode decides gate CRITERIA and approval strictness, not
 * whether an armed gate blocks.
 */
export const POLICY_META: Record<W2PolicyCode, PolicyMeta> = {
  'platform.gate.init-to-plan': {
    name: 'Init → Plan Gate',
    description: 'Require explicit gate review before project leaves Initiation phase.',
    scope: 'PHASE_GATE',
    // Armed → blocks in every mode. LEAN arms none (instantiate skips arming).
    bundleDefaults: { LEAN: false, STANDARD: true, GOVERNED: true },
    bundleSeverity: { STANDARD: 'BLOCK', GOVERNED: 'BLOCK' },
  },
  'platform.gate.plan-to-exec': {
    name: 'Plan → Execution Gate',
    description: 'Gate review with evidence required before Execution begins; highest-impact transition.',
    scope: 'PHASE_GATE',
    bundleDefaults: { LEAN: false, STANDARD: true, GOVERNED: true },
    bundleSeverity: { STANDARD: 'BLOCK', GOVERNED: 'BLOCK' },
  },
  'platform.gate.exec-to-monitor': {
    name: 'Execution → Monitoring Gate',
    description: 'Execution exit gate — milestone deliverables signed off before monitoring.',
    scope: 'PHASE_GATE',
    // Was STANDARD:false/GOVERNED-only — but the template arms this gate in
    // STANDARD too and it hard-blocks. STANDARD now truthfully BLOCK.
    bundleDefaults: { LEAN: false, STANDARD: true, GOVERNED: true },
    bundleSeverity: { STANDARD: 'BLOCK', GOVERNED: 'BLOCK' },
  },
  'platform.gate.monitor-to-closure': {
    name: 'Monitoring → Closure Gate',
    description: 'All work_risks must be CLOSED or ACCEPTED before closeout begins.',
    scope: 'PHASE_GATE',
    bundleDefaults: { LEAN: false, STANDARD: true, GOVERNED: true },
    bundleSeverity: { STANDARD: 'BLOCK', GOVERNED: 'BLOCK' },
  },
  'platform.gate.closure-to-closed': {
    name: 'Closure → Closed Gate',
    description: 'Final sign-off gate — requires evidence and risk owner check.',
    scope: 'PHASE_GATE',
    bundleDefaults: { LEAN: false, STANDARD: true, GOVERNED: true },
    bundleSeverity: { STANDARD: 'BLOCK', GOVERNED: 'BLOCK' },
  },
  // ── CRITERIA policies (NOT transition gates): genuinely mode-gated via
  //    isPolicyActive. GOVERNED-only mapping is HONEST — they do not fire in
  //    STANDARD. Mode decides gate CRITERIA/approval strictness, not whether an
  //    armed transition gate blocks. Unchanged by GATE-MODE-COHERENCE-1.
  'platform.gate.evidence-required': {
    name: 'Gate Evidence Required',
    description: 'Gate submission requires ≥1 artifact document in gate_submission_evidence before SUBMITTED.',
    scope: 'PHASE_GATE',
    bundleDefaults: { LEAN: false, STANDARD: false, GOVERNED: true },
    bundleSeverity: { GOVERNED: 'BLOCK' },
  },
  'platform.gate.closeout-remediation-owner': {
    name: 'Closeout: Risk Owner Required',
    description: 'Closure→Closed gate blocked if any OPEN/MITIGATED/ACCEPTED risk has no owner assigned.',
    scope: 'PHASE_GATE',
    bundleDefaults: { LEAN: false, STANDARD: false, GOVERNED: true },
    bundleSeverity: { GOVERNED: 'BLOCK' },
  },
  'risk-threshold-alert': {
    name: 'Risk Threshold Alert',
    description: 'Advisory warning when project open-risk count exceeds threshold.',
    scope: 'PROJECT',
    bundleDefaults: { LEAN: false, STANDARD: true, GOVERNED: true },
    bundleSeverity: { STANDARD: 'WARN', GOVERNED: 'WARN' },
    // readAtDecisionTime:false — no evaluator reads this yet (E14 not built), so
    // it is declared/validated but never resolved live. editable stays false.
    params: [
      {
        key: 'open_risk_threshold',
        label: 'Open-risk count that triggers the alert',
        type: 'number',
        unit: 'risks',
        min: 1,
        max: 100,
        default: 5,
        readAtDecisionTime: false,
      },
    ],
  },
  'resource-capacity-governance': {
    name: 'Resource Capacity Governance',
    description: 'Block or warn when task assignment exceeds assignee active-task capacity.',
    scope: 'PROJECT',
    bundleDefaults: { LEAN: false, STANDARD: true, GOVERNED: true },
    bundleSeverity: { STANDARD: 'WARN', GOVERNED: 'WARN' },
    // readAtDecisionTime:true — CapacityGovernanceService reads this from
    // workspace_policies.params at assignment time (Unit 6). editable is still
    // false today because the code is NON_EVALUABLE (E7 gate injection absent);
    // it flips true automatically once the code becomes evaluable.
    params: [
      {
        key: 'max_active_tasks',
        label: 'Max active tasks per assignee before a warning',
        type: 'number',
        unit: 'tasks',
        min: 1,
        max: 100,
        default: 15,
        readAtDecisionTime: true,
      },
    ],
  },
};

/** The declared params for a policy code (empty array when none). */
export function getPolicyParams(code: string): PolicyParamMeta[] {
  return POLICY_META[code as W2PolicyCode]?.params ?? [];
}

/** Look up one declared param by code+key. */
export function getPolicyParamMeta(
  code: string,
  key: string,
): PolicyParamMeta | null {
  return getPolicyParams(code).find((p) => p.key === key) ?? null;
}

export interface PolicyParamCoercion {
  ok: boolean;
  value: number | null;
  /** Named error code for a rejected value; null when ok. */
  error: string | null;
  message: string | null;
}

/**
 * Unit 6 single source of truth for validating one param value against its
 * declared schema. Used by BOTH the write path (assertPolicyParamsValid on the
 * PUT) and the read path (CapacityGovernanceService), so validation and
 * resolution can never drift. An unknown key or an out-of-range/non-numeric
 * value is rejected with a NAMED error code — never silently coerced.
 */
export function coercePolicyParam(
  code: string,
  key: string,
  rawValue: unknown,
): PolicyParamCoercion {
  const meta = getPolicyParamMeta(code, key);
  if (!meta) {
    return {
      ok: false,
      value: null,
      error: 'POLICY_PARAM_UNKNOWN_KEY',
      message: `Policy '${code}' has no declared param '${key}'.`,
    };
  }
  const num =
    typeof rawValue === 'number'
      ? rawValue
      : typeof rawValue === 'string' && rawValue.trim() !== ''
        ? Number(rawValue)
        : NaN;
  if (!Number.isFinite(num)) {
    return {
      ok: false,
      value: null,
      error: 'POLICY_PARAM_INVALID_TYPE',
      message: `Param '${key}' on '${code}' must be a finite number.`,
    };
  }
  if (!Number.isInteger(num)) {
    return {
      ok: false,
      value: null,
      error: 'POLICY_PARAM_INVALID_TYPE',
      message: `Param '${key}' on '${code}' must be an integer.`,
    };
  }
  if (
    (meta.min !== null && num < meta.min) ||
    (meta.max !== null && num > meta.max)
  ) {
    return {
      ok: false,
      value: null,
      error: 'POLICY_PARAM_OUT_OF_RANGE',
      message: `Param '${key}' on '${code}' must be between ${meta.min} and ${meta.max} (got ${num}).`,
    };
  }
  return { ok: true, value: num, error: null, message: null };
}

export interface PolicyParamsValidation {
  valid: boolean;
  /** { code, key, message } for each violation. */
  errors: Array<{ code: string; key: string; message: string }>;
}

/**
 * Validate an entire params object for a policy code against the declared
 * allow-list. Empty/absent params are always valid (the no-op path). Any key
 * not declared for that code, or any value out of type/range, is an error.
 */
export function validatePolicyParams(
  code: string,
  params: Record<string, unknown> | null | undefined,
): PolicyParamsValidation {
  const errors: Array<{ code: string; key: string; message: string }> = [];
  if (params == null) return { valid: true, errors };
  for (const [key, rawValue] of Object.entries(params)) {
    const res = coercePolicyParam(code, key, rawValue);
    if (!res.ok) {
      errors.push({ code: res.error!, key, message: res.message! });
    }
  }
  return { valid: errors.length === 0, errors };
}

/** Normalized complexity mode → bundle key */
export type BundleKey = 'LEAN' | 'STANDARD' | 'GOVERNED';

/** Map deprecated workspace complexity mode values to canonical bundle keys */
export function normalizeBundleKey(
  rawMode: string | null | undefined,
): BundleKey | null {
  if (!rawMode) return null;
  const m = rawMode.toUpperCase();
  if (m === 'LEAN') return 'LEAN';
  if (m === 'STANDARD') return 'STANDARD';
  if (m === 'GOVERNED' || m === 'ADVANCED') return 'GOVERNED';
  if (m === 'SIMPLE') return 'LEAN';
  return null;
}
