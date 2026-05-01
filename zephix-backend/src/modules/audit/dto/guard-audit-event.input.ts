import { PlatformRole } from '../../../common/auth/platform-roles';
import type { WorkspaceRole } from '../../workspaces/entities/workspace.entity';

/**
 * Typed input for {@link AuditService.recordGuardEvent}.
 * AD-027 Section 12.2 — guard-layer authorization audit payload.
 */
export interface GuardAuditEventInput {
  organizationId: string;
  workspaceId: string | null;
  actorUserId: string;
  actorPlatformRole: PlatformRole;
  actorWorkspaceRole: WorkspaceRole | string | null;
  endpoint: { method: string; path: string };
  decision: 'ALLOW' | 'DENY';
  denyReason?: string;
  /** Declared requirement, e.g. workspace_owner or workspace_owner|delivery_owner */
  requiredRole: string;
  correlationId?: string;
}
