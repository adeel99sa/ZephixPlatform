/**
 * Phase 4 (2026-04-08) — Frontend phase color palette invariants.
 *
 * Mirrors the agreement expected by the backend test that asserts every
 * phase in pm_waterfall_v2 has a color entry. The two declarations must
 * stay in sync.
 */
import { describe, it, expect } from 'vitest';
import {
  WATERFALL_PHASE_COLORS,
  getPhaseColor,
} from '../phaseColors';

describe('phaseColors (frontend palette mirror)', () => {
  it('declares 5 colors keyed by PMI process group reporting keys', () => {
    expect(Object.keys(WATERFALL_PHASE_COLORS).sort()).toEqual([
      'CLOSE',
      'EXEC',
      'INIT',
      'MONITOR',
      'PLAN',
    ]);
  });

  it('every color is a valid 7-char hex (#rrggbb)', () => {
    for (const color of Object.values(WATERFALL_PHASE_COLORS)) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('matches the backend pm_waterfall_v2.phaseColors palette exactly', () => {
    // Backend declaration in system-template-definitions.ts:
    //   INIT: '#8b5cf6', PLAN: '#06b6d4', EXEC: '#10b981',
    //   MONITOR: '#f59e0b', CLOSE: '#ef4444'
    expect(WATERFALL_PHASE_COLORS).toEqual({
      INIT: '#8b5cf6',
      PLAN: '#06b6d4',
      EXEC: '#10b981',
      MONITOR: '#f59e0b',
      CLOSE: '#ef4444',
    });
  });

  describe('getPhaseColor', () => {
    it('resolves by reportingKey when present', () => {
      expect(getPhaseColor({ reportingKey: 'INIT' })).toBe('#8b5cf6');
      expect(getPhaseColor({ reportingKey: 'PLAN' })).toBe('#06b6d4');
      expect(getPhaseColor({ reportingKey: 'EXEC' })).toBe('#10b981');
      expect(getPhaseColor({ reportingKey: 'MONITOR' })).toBe('#f59e0b');
      expect(getPhaseColor({ reportingKey: 'CLOSE' })).toBe('#ef4444');
    });

    it('falls back to name lookup using canonical PMI process group names', () => {
      // The /work/projects/:id/plan endpoint does not yet expose
      // reportingKey on phases. Name-based fallback keeps colors visible
      // until the API is extended.
      expect(getPhaseColor({ name: 'Initiation' })).toBe('#8b5cf6');
      expect(getPhaseColor({ name: 'Planning' })).toBe('#06b6d4');
      expect(getPhaseColor({ name: 'Execution' })).toBe('#10b981');
      expect(getPhaseColor({ name: 'Monitoring and Control' })).toBe('#f59e0b');
      expect(getPhaseColor({ name: 'Closure' })).toBe('#ef4444');
    });

    it('prefers reportingKey over name when both are present', () => {
      // If somehow both are set and they would resolve to different
      // colors, reportingKey wins because it is the stable identifier.
      expect(
        getPhaseColor({ reportingKey: 'PLAN', name: 'Initiation' }),
      ).toBe('#06b6d4');
    });

    it('returns the slate fallback for unrecognized phases', () => {
      expect(getPhaseColor({ name: 'Custom Phase' })).toBe('#94a3b8');
      expect(getPhaseColor({})).toBe('#94a3b8');
      expect(getPhaseColor({ reportingKey: null, name: null })).toBe('#94a3b8');
    });

    it('returns the slate fallback for an unrecognized reportingKey', () => {
      expect(getPhaseColor({ reportingKey: 'XYZ' })).toBe('#94a3b8');
    });
  });
});
