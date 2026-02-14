/**
 * Phase 3A: Central Entitlement Registry
 *
 * Single source of truth for plan → feature/limit mapping.
 * No magic numbers anywhere else in the codebase.
 */
import { PlanCode } from './plan-code.enum';

/* ── Entitlement Keys ────────────────────────────────────────────────── */

export type EntitlementKey =
  | 'capacity_engine'
  | 'what_if_scenarios'
  | 'portfolio_rollups'
  | 'attachments'
  | 'board_view'
  | 'max_projects'
  | 'max_portfolios'
  | 'max_scenarios'
  | 'max_storage_bytes'
  | 'api_rate_multiplier'
  | 'attachment_retention_days';

/* ── Entitlement Value Types ─────────────────────────────────────────── */

export interface EntitlementDefinition {
  /** Boolean features: is feature enabled? */
  capacity_engine: boolean;
  what_if_scenarios: boolean;
  portfolio_rollups: boolean;
  attachments: boolean;
  board_view: boolean;

  /** Numeric limits: null means unlimited */
  max_projects: number | null;
  max_portfolios: number | null;
  max_scenarios: number | null;
  max_storage_bytes: number | null;
  api_rate_multiplier: number;

  /** Attachment retention in days. null = no expiry. */
  attachment_retention_days: number | null;
}

/* ── Byte Constants ──────────────────────────────────────────────────── */

const MB = 1024 * 1024;
const GB = 1024 * MB;

/* ── Plan Definitions ────────────────────────────────────────────────── */

export const PLAN_ENTITLEMENTS: Record<PlanCode, EntitlementDefinition> = {
  [PlanCode.FREE]: {
    capacity_engine: false,
    what_if_scenarios: false,
    portfolio_rollups: false,
    attachments: true,
    board_view: true,
    max_projects: 3,
    max_portfolios: 1,
    max_scenarios: 0,
    max_storage_bytes: 500 * MB,
    api_rate_multiplier: 1,
    attachment_retention_days: 30,
  },

  [PlanCode.TEAM]: {
    capacity_engine: true,
    what_if_scenarios: false,
    portfolio_rollups: true,
    attachments: true,
    board_view: true,
    max_projects: 20,
    max_portfolios: 5,
    max_scenarios: 0,
    max_storage_bytes: 5 * GB,
    api_rate_multiplier: 2,
    attachment_retention_days: 180,
  },

  [PlanCode.ENTERPRISE]: {
    capacity_engine: true,
    what_if_scenarios: true,
    portfolio_rollups: true,
    attachments: true,
    board_view: true,
    max_projects: null, // unlimited
    max_portfolios: null,
    max_scenarios: null,
    max_storage_bytes: 100 * GB,
    api_rate_multiplier: 10,
    attachment_retention_days: null, // no expiry
  },

  [PlanCode.CUSTOM]: {
    // Custom inherits enterprise defaults; overrides via plan_metadata
    capacity_engine: true,
    what_if_scenarios: true,
    portfolio_rollups: true,
    attachments: true,
    board_view: true,
    max_projects: null,
    max_portfolios: null,
    max_scenarios: null,
    max_storage_bytes: null, // unlimited
    api_rate_multiplier: 10,
    attachment_retention_days: null, // no expiry
  },
};

/* ── Helper to check if a key is a boolean feature ───────────────────── */

const BOOLEAN_FEATURES: Set<EntitlementKey> = new Set([
  'capacity_engine',
  'what_if_scenarios',
  'portfolio_rollups',
  'attachments',
  'board_view',
]);

export function isBooleanFeature(key: EntitlementKey): boolean {
  return BOOLEAN_FEATURES.has(key);
}

/* ── Storage warning threshold ───────────────────────────────────────── */

export const STORAGE_WARNING_THRESHOLD = 0.8; // 80%
