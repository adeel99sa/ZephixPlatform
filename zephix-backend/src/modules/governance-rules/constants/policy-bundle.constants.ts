/**
 * W2 governance policy catalog: 9 codes (7 INSERT platform.gate.*, 2 UPDATE promotions).
 * Bundle mapping governs: which complexity mode enables each policy by default.
 * Severity mapping: effective severity when enabled via a given bundle mode.
 * Resolution: explicit workspace_policies row → bundle default → DISABLED.
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

export interface PolicyBundleDefault {
  LEAN: boolean;
  STANDARD: boolean;
  GOVERNED: boolean;
}

export interface PolicyBundleSeverity {
  STANDARD?: 'WARN' | 'BLOCK';
  GOVERNED?: 'WARN' | 'BLOCK';
}

export interface PolicyMeta {
  name: string;
  description: string;
  scope: 'PHASE_GATE' | 'PROJECT' | 'TASK';
  bundleDefaults: PolicyBundleDefault;
  bundleSeverity: PolicyBundleSeverity;
}

export const POLICY_META: Record<W2PolicyCode, PolicyMeta> = {
  'platform.gate.init-to-plan': {
    name: 'Init → Plan Gate',
    description: 'Require explicit gate review before project leaves Initiation phase.',
    scope: 'PHASE_GATE',
    bundleDefaults: { LEAN: false, STANDARD: true, GOVERNED: true },
    bundleSeverity: { STANDARD: 'WARN', GOVERNED: 'BLOCK' },
  },
  'platform.gate.plan-to-exec': {
    name: 'Plan → Execution Gate',
    description: 'Gate review with evidence required before Execution begins; highest-impact transition.',
    scope: 'PHASE_GATE',
    bundleDefaults: { LEAN: false, STANDARD: true, GOVERNED: true },
    bundleSeverity: { STANDARD: 'WARN', GOVERNED: 'BLOCK' },
  },
  'platform.gate.exec-to-monitor': {
    name: 'Execution → Monitoring Gate',
    description: 'Execution exit gate — milestone deliverables signed off before monitoring.',
    scope: 'PHASE_GATE',
    bundleDefaults: { LEAN: false, STANDARD: false, GOVERNED: true },
    bundleSeverity: { GOVERNED: 'BLOCK' },
  },
  'platform.gate.monitor-to-closure': {
    name: 'Monitoring → Closure Gate',
    description: 'All work_risks must be CLOSED or ACCEPTED before closeout begins.',
    scope: 'PHASE_GATE',
    bundleDefaults: { LEAN: false, STANDARD: false, GOVERNED: true },
    bundleSeverity: { GOVERNED: 'BLOCK' },
  },
  'platform.gate.closure-to-closed': {
    name: 'Closure → Closed Gate',
    description: 'Final sign-off gate — requires evidence and risk owner check.',
    scope: 'PHASE_GATE',
    bundleDefaults: { LEAN: false, STANDARD: false, GOVERNED: true },
    bundleSeverity: { GOVERNED: 'BLOCK' },
  },
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
  },
  'resource-capacity-governance': {
    name: 'Resource Capacity Governance',
    description: 'Block or warn when task assignment exceeds assignee active-task capacity.',
    scope: 'PROJECT',
    bundleDefaults: { LEAN: false, STANDARD: true, GOVERNED: true },
    bundleSeverity: { STANDARD: 'WARN', GOVERNED: 'WARN' },
  },
};

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
