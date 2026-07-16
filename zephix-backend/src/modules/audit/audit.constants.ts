/**
 * Phase 3B: Audit Trail constants.
 * Single source of truth for entity types and actions.
 * No string literals elsewhere.
 */

export enum AuditEntityType {
  ORGANIZATION = 'organization',
  WORKSPACE = 'workspace',
  PROJECT = 'project',
  PORTFOLIO = 'portfolio',
  WORK_TASK = 'work_task',
  WORK_RISK = 'work_risk',
  DOC = 'doc',
  ATTACHMENT = 'attachment',
  SCENARIO_PLAN = 'scenario_plan',
  SCENARIO_ACTION = 'scenario_action',
  SCENARIO_RESULT = 'scenario_result',
  BASELINE = 'baseline',
  CAPACITY_CALENDAR = 'capacity_calendar',
  BILLING_PLAN = 'billing_plan',
  ENTITLEMENT = 'entitlement',
  WEBHOOK = 'webhook',
  BOARD_MOVE = 'board_move',
  USER = 'user',
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  /** AD-027 Section 12: authorization guard decisions */
  AUTHORIZATION_DECISION = 'authorization_decision',
  /** Template Center entity types (TC consolidation, Engine 4 Phase B prerequisite) */
  TEMPLATE_LINEAGE = 'TEMPLATE_LINEAGE',
  GATE_APPROVAL = 'GATE_APPROVAL',
  DOCUMENT_INSTANCE = 'DOCUMENT_INSTANCE',
  /** Sprint 5.1 — Path B Beta project artifacts foundation. */
  PROJECT_ARTIFACT = 'project_artifact',
  PROJECT_ARTIFACT_ITEM = 'project_artifact_item',
  /** W2-C2: gate submission lifecycle audit. */
  PHASE_GATE_SUBMISSION = 'phase_gate_submission',
  /** TC-B6: template catalog mutations (e.g. preferred flag). */
  TEMPLATE = 'template',
  /**
   * SEC-3: system-level security control events with no user/org subject
   * (e.g. the per-account auth rate limiter degrading/recovering). Written
   * with the zero-UUID SYSTEM actor + org. CHECK widened in migration
   * 18000000000213.
   */
  SECURITY = 'security',
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  ACTIVATE = 'activate',
  COMPUTE = 'compute',
  ATTACH = 'attach',
  DETACH = 'detach',
  INVITE = 'invite',
  ACCEPT = 'accept',
  SUSPEND = 'suspend',
  REINSTATE = 'reinstate',
  UPLOAD_COMPLETE = 'upload_complete',
  DOWNLOAD_LINK = 'download_link',
  PRESIGN_CREATE = 'presign_create',
  QUOTA_BLOCK = 'quota_block',
  PLAN_STATUS_BLOCK = 'plan_status_block',
  WIP_OVERRIDE = 'wip_override',
  ROLE_CHANGE = 'role_change',
  USER_REGISTERED = 'user_registered',
  ORG_CREATED = 'org_created',
  EMAIL_VERIFICATION_SENT = 'email_verification_sent',
  EMAIL_VERIFIED = 'email_verified',
  EMAIL_VERIFICATION_BYPASSED = 'email_verification_bypassed',
  RESEND_VERIFICATION = 'resend_verification',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  /** AUTH-1: admin generated a one-time reset link for a locked-out user. */
  PASSWORD_RESET_LINK_GENERATED = 'password_reset_link_generated',
  GOVERNANCE_EVALUATE = 'governance_evaluate',
  /** Soft-removed to trash / Archive & delete (recoverable) */
  SOFT_REMOVE_TO_TRASH = 'soft_remove_to_trash',
  /** Restored from trash within retention window */
  RESTORE_FROM_TRASH = 'restore_from_trash',
  /** Scheduled or manual batch permanent purge past retention */
  RETENTION_PURGE_BATCH = 'retention_purge_batch',
  /** Single-entity permanent delete from trash */
  PERMANENT_DELETE_FROM_TRASH = 'permanent_delete_from_trash',
  /** AD-027 Section 12.2: guard allowed request (config/destructive, 2xx) */
  GUARD_ALLOW = 'guard_allow',
  /** AD-027 Section 12.2: guard denied request (401/403 on audited routes) */
  GUARD_DENY = 'guard_deny',
  /** Template Center actions (TC consolidation, Engine 4 Phase B prerequisite) */
  TEMPLATE_APPLIED = 'TEMPLATE_APPLIED',
  TEMPLATE_APPLY_FAILED = 'TEMPLATE_APPLY_FAILED',
  GATE_DECIDE = 'GATE_DECIDE',
  GATE_DECIDE_BLOCKED = 'GATE_DECIDE_BLOCKED',
  DOC_TRANSITION = 'DOC_TRANSITION',
  DOCUMENT_TRANSITION_FAILED = 'DOCUMENT_TRANSITION_FAILED',
  /**
   * B2 (ADR-B2-004): emitted by WorkspacesService.setComplexityMode whenever
   * a workspace's complexity tier changes. Carries before/after values + actor.
   * The matching audit_events.action CHECK constraint is widened in PR1
   * migration 18000000000171, so emits land in the table on first PR2
   * controller invoke (no audit gap window).
   */
  COMPLEXITY_MODE_CHANGED = 'complexity_mode_changed',
  /**
   * A6 (2026-05-21): emitted by AdminController when a platform admin
   * changes an organization's plan_code. Carries previousPlan, newPlan,
   * and the mandatory operator-supplied reason. Matching CHECK constraint
   * extended in migration 18000000000177.
   */
  PLAN_CHANGED = 'plan_changed',
  /**
   * W2-C2: emitted by PhaseGateEvaluatorService.transitionSubmission() on a
   * successful DRAFT→SUBMITTED transition. Governance-critical path — written
   * via recordOrThrow inside the same transaction as the submission save so a
   * failed audit rolls back the state change.
   */
  GATE_SUBMITTED = 'GATE_SUBMITTED',
  /**
   * SEC-3: per-account auth rate limiter (RedisAuthRateLimitStore) lost its
   * Redis backend and is failing OPEN — rate limiting is silently disabled
   * until recovery. Emitted once on the degradation transition (not per
   * request). Ruling A (fail-open-loud): the control that stops running must
   * say so, on the record, once. Matching CHECK widened in migration
   * 18000000000213.
   */
  AUTH_RATE_LIMIT_DEGRADED = 'AUTH_RATE_LIMIT_DEGRADED',
  /** SEC-3: Redis reachable again; per-account rate limiting re-armed. */
  AUTH_RATE_LIMIT_RECOVERED = 'AUTH_RATE_LIMIT_RECOVERED',
}

/** Keys that must be stripped from any JSONB payload before persistence. */
export const SANITIZE_KEYS = new Set([
  'token', 'refresh', 'refreshToken', 'password', 'secret',
  'signature', 'presigned', 'presignedUrl', 'presignedPutUrl',
  'presignedGetUrl', 'url', 'storageEndpoint', 'accessKey',
  'secretKey', 'apiKey', 'authorization', 'cookie',
]);

/** Metadata source tags to prevent double-logging */
export enum AuditSource {
  ATTACHMENTS = 'attachments',
  SCENARIOS = 'scenarios',
  BASELINES = 'baselines',
  SCHEDULE_DRAG = 'schedule_drag',
  CAPACITY = 'capacity',
  PORTFOLIO = 'portfolio',
  BOARD = 'board',
  ROLE_CHANGE = 'role_change',
  INVITE = 'invite',
}
