/**
 * Typed payloads for identity-domain events.
 *
 * These events are published by AuthService, IdentityService,
 * MfaService, OrgInvitesService, and the workspace-members controller
 * (in PR2 cutover). Subscribers include B4 (Audit) and B5 (Notifications).
 *
 * Transport: events flow through the existing `auth_outbox` table via
 * the `IdentityEventBus` interface. PR1 ships a no-op implementation
 * (`NoOpIdentityEventBus`) so identity services can publish freely
 * without affecting runtime; PR2 wires the real outbox writer.
 *
 * Refer: docs/builds/build1-rbac-reconciled-spec.md §6 ADR-011.
 */

export type IdentityEventType =
  | 'user.created'
  | 'user.role_changed'
  | 'user.deactivated'
  | 'user.reactivated'
  | 'user.password_changed'
  | 'workspace.member_added'
  | 'workspace.member_removed'
  | 'auth.login_success'
  | 'auth.login_failure'
  | 'auth.token_refresh_reuse_detected';

/** Common envelope every identity event carries. */
export interface IdentityEventBase {
  type: IdentityEventType;
  /** Wall-clock time the event was emitted (UTC). */
  occurredAt: Date;
  /** Org context — required for tenant scoping in audit/notifications. Null for cross-org admin actions. */
  organizationId: string | null;
  /** User who performed the action that produced the event (null for system events). */
  actorUserId: string | null;
  /** Stable correlation ID for tying events back to a request — typically `req.id`. */
  requestId?: string;
}

// ─── User domain ─────────────────────────────────────────────────────────

export type UserCreationSource =
  | 'signup'
  | 'invitation_accepted'
  | 'workspace_invitation_accepted'
  | 'google_oauth'
  | 'admin_created';

export interface UserCreatedEvent extends IdentityEventBase {
  type: 'user.created';
  userId: string;
  email: string;
  organizationId: string;
  source: UserCreationSource;
  initialOrgRole: 'owner' | 'admin' | 'member' | 'viewer';
}

export interface UserRoleChangedEvent extends IdentityEventBase {
  type: 'user.role_changed';
  userId: string;
  organizationId: string;
  fromRole: 'owner' | 'admin' | 'member' | 'viewer';
  toRole: 'owner' | 'admin' | 'member' | 'viewer';
}

export type UserDeactivationReason =
  | 'admin_deactivated'
  | 'self_deactivated'
  | 'system_compliance';

export interface UserDeactivatedEvent extends IdentityEventBase {
  type: 'user.deactivated';
  userId: string;
  organizationId: string;
  reason: UserDeactivationReason;
}

export interface UserReactivatedEvent extends IdentityEventBase {
  type: 'user.reactivated';
  userId: string;
  organizationId: string;
}

export interface UserPasswordChangedEvent extends IdentityEventBase {
  type: 'user.password_changed';
  userId: string;
  organizationId: string;
  /** 'self' = user changed own; 'reset' = via reset token; 'admin' = admin force-reset (future). */
  trigger: 'self' | 'reset' | 'admin';
}

// ─── Workspace membership ────────────────────────────────────────────────

export interface WorkspaceMemberAddedEvent extends IdentityEventBase {
  type: 'workspace.member_added';
  workspaceId: string;
  organizationId: string;
  userId: string;
  workspaceRole: string;
  /** 'invitation_accepted' | 'admin_added' | 'org_invite_assigned' */
  source: 'invitation_accepted' | 'admin_added' | 'org_invite_assigned';
}

export interface WorkspaceMemberRemovedEvent extends IdentityEventBase {
  type: 'workspace.member_removed';
  workspaceId: string;
  organizationId: string;
  userId: string;
  /** 'admin_removed' | 'self_left' | 'org_membership_revoked' */
  reason: 'admin_removed' | 'self_left' | 'org_membership_revoked';
}

// ─── Auth events ─────────────────────────────────────────────────────────

export interface AuthLoginSuccessEvent extends IdentityEventBase {
  type: 'auth.login_success';
  userId: string;
  organizationId: string;
  /** 'password' | 'google_oauth' | 'mfa_challenge' | 'smoke_login' */
  method: 'password' | 'google_oauth' | 'mfa_challenge' | 'smoke_login';
  ipAddress: string | null;
  userAgent: string | null;
}

export interface AuthLoginFailureEvent extends IdentityEventBase {
  type: 'auth.login_failure';
  /** Hashed email (never raw) so the event can be safely logged. */
  emailHash: string;
  /** 'invalid_credentials' | 'mfa_invalid_code' | 'rate_limited' | 'email_not_verified' | 'account_deactivated' */
  reason:
    | 'invalid_credentials'
    | 'mfa_invalid_code'
    | 'rate_limited'
    | 'email_not_verified'
    | 'account_deactivated';
  ipAddress: string | null;
  userAgent: string | null;
}

export interface AuthTokenRefreshReuseDetectedEvent extends IdentityEventBase {
  type: 'auth.token_refresh_reuse_detected';
  userId: string;
  organizationId: string;
  /** family_id whose tokens were invalidated. */
  familyId: string;
  /** Number of sessions in the family revoked as a result. */
  invalidatedSessionCount: number;
  ipAddress: string | null;
  userAgent: string | null;
}

// ─── Discriminated union ─────────────────────────────────────────────────

export type IdentityEvent =
  | UserCreatedEvent
  | UserRoleChangedEvent
  | UserDeactivatedEvent
  | UserReactivatedEvent
  | UserPasswordChangedEvent
  | WorkspaceMemberAddedEvent
  | WorkspaceMemberRemovedEvent
  | AuthLoginSuccessEvent
  | AuthLoginFailureEvent
  | AuthTokenRefreshReuseDetectedEvent;
