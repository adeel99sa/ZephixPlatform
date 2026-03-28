/**
 * Phase 3A: Entitlement Registry Tests
 *
 * Validates plan definitions, feature flags, limits, and helper functions.
 */
import { PlanCode } from '../plan-code.enum';
import {
  PLAN_ENTITLEMENTS,
  isBooleanFeature,
  STORAGE_WARNING_THRESHOLD,
  EntitlementKey,
} from '../entitlement.registry';

describe('Entitlement Registry', () => {
  // ── Plan existence ─────────────────────────────────────────────────

  it('defines entitlements for all plan codes', () => {
    for (const code of Object.values(PlanCode)) {
      expect(PLAN_ENTITLEMENTS[code]).toBeDefined();
    }
  });

  // ── FREE plan ─────────────────────────────────────────────────────

  it('FREE plan disables capacity_engine', () => {
    expect(PLAN_ENTITLEMENTS[PlanCode.FREE].capacity_engine).toBe(false);
  });

  it('FREE plan disables what_if_scenarios', () => {
    expect(PLAN_ENTITLEMENTS[PlanCode.FREE].what_if_scenarios).toBe(false);
  });

  it('FREE plan disables portfolio_rollups', () => {
    expect(PLAN_ENTITLEMENTS[PlanCode.FREE].portfolio_rollups).toBe(false);
  });

  it('FREE plan enables attachments', () => {
    expect(PLAN_ENTITLEMENTS[PlanCode.FREE].attachments).toBe(true);
  });

  it('FREE plan enables board_view', () => {
    expect(PLAN_ENTITLEMENTS[PlanCode.FREE].board_view).toBe(true);
  });

  it('FREE plan limits projects to 3', () => {
    expect(PLAN_ENTITLEMENTS[PlanCode.FREE].max_projects).toBe(3);
  });

  it('FREE plan limits portfolios to 1', () => {
    expect(PLAN_ENTITLEMENTS[PlanCode.FREE].max_portfolios).toBe(1);
  });

  it('FREE plan limits scenarios to 0', () => {
    expect(PLAN_ENTITLEMENTS[PlanCode.FREE].max_scenarios).toBe(0);
  });

  it('FREE plan limits storage to 500 MB', () => {
    expect(PLAN_ENTITLEMENTS[PlanCode.FREE].max_storage_bytes).toBe(500 * 1024 * 1024);
  });

  // ── TEAM plan ─────────────────────────────────────────────────────

  it('TEAM plan enables capacity_engine', () => {
    expect(PLAN_ENTITLEMENTS[PlanCode.TEAM].capacity_engine).toBe(true);
  });

  it('TEAM plan disables what_if_scenarios', () => {
    expect(PLAN_ENTITLEMENTS[PlanCode.TEAM].what_if_scenarios).toBe(false);
  });

  it('TEAM plan enables portfolio_rollups', () => {
    expect(PLAN_ENTITLEMENTS[PlanCode.TEAM].portfolio_rollups).toBe(true);
  });

  it('TEAM plan limits projects to 20', () => {
    expect(PLAN_ENTITLEMENTS[PlanCode.TEAM].max_projects).toBe(20);
  });

  // ── ENTERPRISE plan ───────────────────────────────────────────────

  it('ENTERPRISE enables all features', () => {
    const e = PLAN_ENTITLEMENTS[PlanCode.ENTERPRISE];
    expect(e.capacity_engine).toBe(true);
    expect(e.what_if_scenarios).toBe(true);
    expect(e.portfolio_rollups).toBe(true);
    expect(e.attachments).toBe(true);
    expect(e.board_view).toBe(true);
  });

  it('ENTERPRISE has unlimited projects', () => {
    expect(PLAN_ENTITLEMENTS[PlanCode.ENTERPRISE].max_projects).toBeNull();
  });

  it('ENTERPRISE has unlimited portfolios', () => {
    expect(PLAN_ENTITLEMENTS[PlanCode.ENTERPRISE].max_portfolios).toBeNull();
  });

  it('ENTERPRISE has unlimited scenarios', () => {
    expect(PLAN_ENTITLEMENTS[PlanCode.ENTERPRISE].max_scenarios).toBeNull();
  });

  it('ENTERPRISE storage is 100 GB', () => {
    expect(PLAN_ENTITLEMENTS[PlanCode.ENTERPRISE].max_storage_bytes).toBe(100 * 1024 * 1024 * 1024);
  });

  // ── CUSTOM plan ───────────────────────────────────────────────────

  it('CUSTOM plan inherits enterprise defaults', () => {
    const c = PLAN_ENTITLEMENTS[PlanCode.CUSTOM];
    expect(c.capacity_engine).toBe(true);
    expect(c.what_if_scenarios).toBe(true);
    expect(c.max_storage_bytes).toBeNull(); // unlimited
  });

  // ── Helper functions ──────────────────────────────────────────────

  it('isBooleanFeature returns true for feature keys', () => {
    expect(isBooleanFeature('capacity_engine')).toBe(true);
    expect(isBooleanFeature('what_if_scenarios')).toBe(true);
    expect(isBooleanFeature('portfolio_rollups')).toBe(true);
    expect(isBooleanFeature('attachments')).toBe(true);
    expect(isBooleanFeature('board_view')).toBe(true);
  });

  it('isBooleanFeature returns false for limit keys', () => {
    expect(isBooleanFeature('max_projects')).toBe(false);
    expect(isBooleanFeature('max_storage_bytes')).toBe(false);
    expect(isBooleanFeature('api_rate_multiplier')).toBe(false);
  });

  it('STORAGE_WARNING_THRESHOLD is 0.8', () => {
    expect(STORAGE_WARNING_THRESHOLD).toBe(0.8);
  });
});
