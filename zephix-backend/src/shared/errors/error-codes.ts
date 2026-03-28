/**
 * Phase 3D: Canonical Error Codes
 *
 * Single source of truth for all API error codes.
 * Every error response must include a `code` from this enum.
 * The ApiErrorFilter falls back to status-based mapping when
 * no explicit code is provided.
 */

export enum ErrorCode {
  // ── Authentication ──────────────────────────────────────────
  AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN = 'AUTH_FORBIDDEN',

  // ── Entitlements & Billing ──────────────────────────────────
  ENTITLEMENT_REQUIRED = 'ENTITLEMENT_REQUIRED',
  PLAN_INACTIVE = 'PLAN_INACTIVE',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  STORAGE_LIMIT_EXCEEDED = 'STORAGE_LIMIT_EXCEEDED',
  PROJECT_LIMIT_EXCEEDED = 'PROJECT_LIMIT_EXCEEDED',
  PORTFOLIO_LIMIT_EXCEEDED = 'PORTFOLIO_LIMIT_EXCEEDED',
  SCENARIO_LIMIT_EXCEEDED = 'SCENARIO_LIMIT_EXCEEDED',

  // ── Attachment Lifecycle ────────────────────────────────────
  ATTACHMENT_EXPIRED = 'ATTACHMENT_EXPIRED',
  ATTACHMENT_PENDING = 'ATTACHMENT_PENDING',

  // ── Validation ──────────────────────────────────────────────
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // ── Domain Rules ────────────────────────────────────────────
  WIP_LIMIT_EXCEEDED = 'WIP_LIMIT_EXCEEDED',
  BASELINE_LOCKED = 'BASELINE_LOCKED',
  CONFLICT = 'CONFLICT',

  // ── Resource ────────────────────────────────────────────────
  NOT_FOUND = 'NOT_FOUND',

  // ── Infrastructure ──────────────────────────────────────────
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

/**
 * Map HTTP status codes to canonical error codes.
 * Used by ApiErrorFilter when no explicit code is provided.
 */
export const STATUS_TO_ERROR_CODE: Record<number, ErrorCode> = {
  400: ErrorCode.VALIDATION_ERROR,
  401: ErrorCode.AUTH_UNAUTHORIZED,
  403: ErrorCode.AUTH_FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.CONFLICT,
  410: ErrorCode.ATTACHMENT_EXPIRED,
  429: ErrorCode.RATE_LIMITED,
  500: ErrorCode.INTERNAL_ERROR,
  503: ErrorCode.SERVICE_UNAVAILABLE,
};
