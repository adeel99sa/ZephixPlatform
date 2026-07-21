import {
  coercePolicyParam,
  validatePolicyParams,
  getPolicyParams,
  POLICY_META,
  NON_EVALUABLE_POLICY_CODES,
  W2_POLICY_CODES,
} from '../constants/policy-bundle.constants';

/**
 * Unit 6 — the param allow-list is the single source of truth for both the
 * write path (validatePolicyParams on the PUT) and the read path
 * (coercePolicyParam in the evaluator). These pure-function tests pin the
 * contract so validation and resolution cannot drift.
 */
describe('policy param allow-list (Unit 6)', () => {
  describe('coercePolicyParam', () => {
    it('accepts an in-range integer', () => {
      const r = coercePolicyParam('resource-capacity-governance', 'max_active_tasks', 20);
      expect(r).toEqual({ ok: true, value: 20, error: null, message: null });
    });

    it('coerces a numeric string', () => {
      const r = coercePolicyParam('resource-capacity-governance', 'max_active_tasks', '20');
      expect(r.ok).toBe(true);
      expect(r.value).toBe(20);
    });

    it('rejects an unknown key', () => {
      const r = coercePolicyParam('resource-capacity-governance', 'nope', 5);
      expect(r.ok).toBe(false);
      expect(r.error).toBe('POLICY_PARAM_UNKNOWN_KEY');
    });

    it('rejects a key on a policy that declares no params', () => {
      const r = coercePolicyParam('platform.gate.evidence-required', 'max_active_tasks', 5);
      expect(r.ok).toBe(false);
      expect(r.error).toBe('POLICY_PARAM_UNKNOWN_KEY');
    });

    it('rejects a non-numeric value', () => {
      const r = coercePolicyParam('resource-capacity-governance', 'max_active_tasks', 'lots');
      expect(r.ok).toBe(false);
      expect(r.error).toBe('POLICY_PARAM_INVALID_TYPE');
    });

    it('rejects a non-integer value', () => {
      const r = coercePolicyParam('resource-capacity-governance', 'max_active_tasks', 2.5);
      expect(r.ok).toBe(false);
      expect(r.error).toBe('POLICY_PARAM_INVALID_TYPE');
    });

    it('rejects below-min and above-max', () => {
      expect(coercePolicyParam('resource-capacity-governance', 'max_active_tasks', 0).error)
        .toBe('POLICY_PARAM_OUT_OF_RANGE');
      expect(coercePolicyParam('resource-capacity-governance', 'max_active_tasks', 101).error)
        .toBe('POLICY_PARAM_OUT_OF_RANGE');
    });
  });

  describe('validatePolicyParams', () => {
    it('null / empty params are valid (no-op path)', () => {
      expect(validatePolicyParams('resource-capacity-governance', null).valid).toBe(true);
      expect(validatePolicyParams('resource-capacity-governance', {}).valid).toBe(true);
    });

    it('collects every violation, not just the first', () => {
      const r = validatePolicyParams('resource-capacity-governance', {
        max_active_tasks: 9999,
        bogus: 1,
      });
      expect(r.valid).toBe(false);
      expect(r.errors).toHaveLength(2);
    });
  });

  describe('declared schema shape', () => {
    it('only the two PROJECT-scope threshold policies declare params', () => {
      const withParams = W2_POLICY_CODES.filter((c) => getPolicyParams(c).length > 0);
      expect(withParams.sort()).toEqual(
        ['resource-capacity-governance', 'risk-threshold-alert'].sort(),
      );
    });

    it('every declared param is fully specified (key/label/type/default)', () => {
      for (const code of W2_POLICY_CODES) {
        for (const p of getPolicyParams(code)) {
          expect(p.key).toBeTruthy();
          expect(p.label).toBeTruthy();
          expect(p.type).toBe('number');
          expect(typeof p.default).toBe('number');
        }
      }
    });

    it('the wired param default equals the evaluator constant (capacity=15)', () => {
      const cap = POLICY_META['resource-capacity-governance'].params!
        .find((p) => p.key === 'max_active_tasks')!;
      expect(cap.default).toBe(15);
      expect(cap.readAtDecisionTime).toBe(true);
    });

    it('both param-bearing policies are NON_EVALUABLE today, so their params must not be editable-eligible via evaluability', () => {
      // editable = isPolicyEvaluable(code) && readAtDecisionTime. Both codes are
      // non-evaluable, so editable is false regardless of readAtDecisionTime.
      expect(NON_EVALUABLE_POLICY_CODES.has('resource-capacity-governance')).toBe(true);
      expect(NON_EVALUABLE_POLICY_CODES.has('risk-threshold-alert')).toBe(true);
    });
  });
});

/**
 * GATE-MODE-COHERENCE-1 — the catalog must not claim a gate is advisory when
 * the enforcement path hard-refuses. Source-level pin: the five phase-transition
 * gates resolve BLOCK in every mode that arms them (STANDARD + GOVERNED); the two
 * criteria policies stay GOVERNED-only (honest, isPolicyActive-gated).
 */
describe('gate-mode coherence (GATE-MODE-COHERENCE-1)', () => {
  const TRANSITION_GATES = [
    'platform.gate.init-to-plan',
    'platform.gate.plan-to-exec',
    'platform.gate.exec-to-monitor',
    'platform.gate.monitor-to-closure',
    'platform.gate.closure-to-closed',
  ] as const;

  it('transition gates are BLOCK in STANDARD and GOVERNED (never WARN)', () => {
    for (const code of TRANSITION_GATES) {
      const m = POLICY_META[code];
      expect(m.bundleSeverity.STANDARD).toBe('BLOCK');
      expect(m.bundleSeverity.GOVERNED).toBe('BLOCK');
      expect(m.bundleDefaults.STANDARD).toBe(true);
      expect(m.bundleDefaults.GOVERNED).toBe(true);
      expect(m.bundleDefaults.LEAN).toBe(false); // LEAN arms none
    }
  });

  it('no gate policy claims WARN in any mode (advisory belongs to the two dark PROJECT policies only)', () => {
    for (const code of TRANSITION_GATES) {
      const s = POLICY_META[code].bundleSeverity;
      expect(s.STANDARD).not.toBe('WARN');
      expect(s.GOVERNED).not.toBe('WARN');
    }
  });

  it('criteria policies stay GOVERNED-only (unchanged): off in STANDARD', () => {
    for (const code of ['platform.gate.evidence-required', 'platform.gate.closeout-remediation-owner'] as const) {
      const m = POLICY_META[code];
      expect(m.bundleDefaults.STANDARD).toBe(false);
      expect(m.bundleDefaults.GOVERNED).toBe(true);
    }
  });
});
