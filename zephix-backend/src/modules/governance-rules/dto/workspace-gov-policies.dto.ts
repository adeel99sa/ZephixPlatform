import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertWorkspaceGovPolicyDto {
  @IsString()
  workspaceId: string;

  @IsBoolean()
  isEnabled: boolean;

  @IsOptional()
  params?: Record<string, any>;
}

/**
 * GOV-BUILD WAVE-1 Unit 5 — the policy read contract the admin sentence view
 * (When → Where → Then → Who can release it) builds against. The sentence is
 * composed SERVER-SIDE; the frontend never builds policy language.
 *
 * This is a SUPERSET: the legacy six-column-grid fields (humanLabel,
 * enforcementPoint, outcome, enabled, params, bundleDefaults) are retained for
 * backward-compatibility while the grid is retired, and the new sentence-view
 * fields (when / scope / verdict / release / state / stateReason) are added.
 */

/** One tunable threshold with its current effective value. */
export interface PolicyWhenParam {
  key: string;
  label: string;
  value: number | string;
  unit: string | null;
  /**
   * true ONLY when Unit 6 made this param genuinely read at decision time AND
   * the policy is evaluable — i.e. isPolicyEvaluable(code) && readAtDecisionTime.
   * A NOT_EVALUABLE policy always returns editable:false (a customer must never
   * see an editable number on a card the engine can't act on).
   */
  editable: boolean;
  min: number | null;
  max: number | null;
}

export interface PolicyWhenView {
  /** Human sentence, composed server-side. null when a policy has no sentence form. */
  text: string | null;
  params: PolicyWhenParam[];
}

export interface PolicyScopeView {
  tier: 'system' | 'organization' | 'workspace' | 'template' | 'project';
  /** Human-readable, e.g. "Workspace — PMO". */
  label: string;
}

export interface PolicyReleaseView {
  /** Read faithfully from the gate approval chain — never hardcoded. */
  requiredRole: string;
  approvalsRequired: number;
  label: string;
}

/**
 * Three distinct situations the UI must be able to tell apart — conflating the
 * last two is a customer-facing lie about their own configuration:
 *   ENFORCING     — on, evaluable, actually acting
 *   DISABLED      — evaluable, but the admin turned it off (their choice)
 *   NOT_EVALUABLE — cannot evaluate: input engine absent (our gap)
 */
export type PolicyState = 'ENFORCING' | 'DISABLED' | 'NOT_EVALUABLE';

export interface PolicyView {
  code: string;
  name: string;

  // ── sentence-view contract (Unit 5) ──────────────────────────────────────
  when: PolicyWhenView;
  scope: PolicyScopeView;
  /** severityEffective resolved for the workspace's complexity mode. */
  verdict: 'ALLOW' | 'WARN' | 'BLOCK' | null;
  /** null when verdict is not BLOCK, or when no approval chain is provisioned. */
  release: PolicyReleaseView | null;
  state: PolicyState;
  stateReason: string | null;

  // ── retained honesty/compat fields ───────────────────────────────────────
  /** GOV-FIX-B1 (1.1): self-describing catalog fields. */
  humanLabel: string;
  description: string;
  /** The enforcement-object category (PHASE_GATE|PROJECT|TASK). Legacy `scope`. */
  enforcementScope: string;
  /** The runtime event this policy hooks (from POLICY_ENFORCEMENT_POINT). */
  enforcementPoint: string;
  /** Effective outcome when enabled: BLOCK|WARN (null when disabled). Alias of severityEffective. */
  outcome: 'BLOCK' | 'WARN' | null;
  severityEffective: 'BLOCK' | 'WARN' | null;
  source: 'workspace' | 'bundle' | 'disabled';
  enabled: boolean;
  isEnabled: boolean;
  /**
   * Honesty primitive: false when no evaluator/data source exists for this code
   * (the skipped promotions). NEVER faked true — the UI keys off this so it does
   * not claim a policy protects when it cannot.
   */
  isEvaluable: boolean;
  params: Record<string, any> | null;
  bundleDefaults: { LEAN: boolean; STANDARD: boolean; GOVERNED: boolean };
}
