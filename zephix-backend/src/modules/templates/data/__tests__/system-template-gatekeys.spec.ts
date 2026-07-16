/**
 * AGILE-1 — every system-template phase gateKey MUST resolve to a canonical W2
 * gate policy. This is the enumeration quality target as an executable guard: it
 * fails the build the moment a template introduces a dangling key again (the
 * exact drift that let plan-to-deliver / deliver-to-close / stabilize-to-deploy
 * ship ungoverned). Zero dangling keys, system-wide, forever.
 */
import { SYSTEM_TEMPLATE_DEFS } from '../system-template-definitions';
import {
  isKnownGateKey,
  KNOWN_GATE_KEYS,
} from '../../../governance-rules/constants/policy-bundle.constants';

describe('AGILE-1 — system template gateKeys resolve to canonical W2 codes', () => {
  const withGates = SYSTEM_TEMPLATE_DEFS.flatMap((tpl) =>
    (tpl.phases ?? [])
      .filter((p: any) => p.gateKey)
      .map((p: any) => ({ template: tpl.name, phase: p.name, gateKey: p.gateKey })),
  );

  it('enumeration returns ZERO dangling keys across all system templates', () => {
    const dangling = withGates.filter((g) => !isKnownGateKey(g.gateKey));
    expect(dangling).toEqual([]); // any dangling key prints template+phase+key
  });

  it('the three reconciled keys are absent and their canonical targets are valid', () => {
    const allKeys = withGates.map((g) => g.gateKey);
    for (const dead of [
      'platform.gate.plan-to-deliver',
      'platform.gate.deliver-to-close',
      'platform.gate.stabilize-to-deploy',
    ]) {
      expect(allKeys).not.toContain(dead);
    }
    for (const live of [
      'platform.gate.plan-to-exec',
      'platform.gate.monitor-to-closure',
      'platform.gate.exec-to-monitor',
    ]) {
      expect(KNOWN_GATE_KEYS.has(live)).toBe(true);
    }
  });
});

describe('isKnownGateKey', () => {
  it('true for every platform.gate.* W2 code', () => {
    for (const k of KNOWN_GATE_KEYS) expect(isKnownGateKey(k)).toBe(true);
  });
  it('false for the retired dangling keys and for garbage', () => {
    expect(isKnownGateKey('platform.gate.plan-to-deliver')).toBe(false);
    expect(isKnownGateKey('platform.gate.stabilize-to-deploy')).toBe(false);
    expect(isKnownGateKey('risk-threshold-alert')).toBe(false); // W2 code, but not a gate
    expect(isKnownGateKey('nonsense')).toBe(false);
    expect(isKnownGateKey('')).toBe(false);
  });
});
