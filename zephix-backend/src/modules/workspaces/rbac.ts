import { WorkspaceRole } from './entities/workspace.entity';

export type OrgRole = 'admin' | 'project_manager' | 'viewer';

export interface Actor {
  id: string;
  orgRole: OrgRole;
  wsRole?: WorkspaceRole | null;
}

export function canInviteExternal(orgRole: OrgRole): boolean {
  return orgRole === 'admin';
}

export function canManageWsMembers(
  orgRole: OrgRole,
  wsRole?: WorkspaceRole | null,
): boolean {
  if (orgRole === 'admin') return true;
  return wsRole === 'owner';
}

export function canAssignOwner(orgRole: OrgRole): boolean {
  return orgRole === 'admin';
}

export function canDeleteWorkspace(
  orgRole: OrgRole,
  wsRole?: WorkspaceRole | null,
  isOwner?: boolean,
): boolean {
  if (orgRole === 'admin') return true;
  return wsRole === 'owner' || isOwner === true;
}
