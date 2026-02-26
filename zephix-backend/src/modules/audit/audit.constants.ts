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
