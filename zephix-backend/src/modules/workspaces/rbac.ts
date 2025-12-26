import { WorkspaceRole } from './entities/workspace.entity';
import {
  PlatformRole,
  normalizePlatformRole,
  isAdminRole,
} from '../../shared/enums/platform-roles.enum';

// Legacy type for backward compatibility - maps to PlatformRole
export type OrgRole = 'admin' | 'project_manager' | 'viewer';

export interface Actor {
  id: string;
  orgRole: OrgRole | PlatformRole; // Accept both for backward compatibility
  wsRole?: WorkspaceRole | null;
}

export function canInviteExternal(orgRole: OrgRole | PlatformRole): boolean {
  const normalized = normalizePlatformRole(orgRole);
  return normalized === PlatformRole.ADMIN;
}

export function canManageWsMembers(
  orgRole: OrgRole | PlatformRole,
  wsRole?: WorkspaceRole | null,
): boolean {
  const normalized = normalizePlatformRole(orgRole);
  if (normalized === PlatformRole.ADMIN) return true;
  return wsRole === 'workspace_owner';
}

export function canAssignOwner(orgRole: OrgRole | PlatformRole): boolean {
  const normalized = normalizePlatformRole(orgRole);
  return normalized === PlatformRole.ADMIN;
}

export function canDeleteWorkspace(
  orgRole: OrgRole | PlatformRole,
  wsRole?: WorkspaceRole | null,
  isOwner?: boolean,
): boolean {
  const normalized = normalizePlatformRole(orgRole);
  if (normalized === PlatformRole.ADMIN) return true;
  return wsRole === 'workspace_owner' || isOwner === true;
}
