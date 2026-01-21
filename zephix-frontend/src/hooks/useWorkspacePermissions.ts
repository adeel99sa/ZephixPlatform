/**
 * PROMPT 6: Workspace Permissions Hook
 *
 * Provides capability flags based on workspace access level.
 * This is the single source of truth for workspace permissions.
 *
 * PROMPT 6 D1: Hard rule
 * - If platformRole is Guest then force isReadOnly true and workspaceAccessLevel Guest
 *
 * Capability mapping:
 * - Owner: canManageWorkspace=true, canManageMembers=true, canCreateWork=true, canEditWork=true
 * - Member (workspace_member): canManageWorkspace=false, canManageMembers=false, canCreateWork=true, canEditWork=true
 * - Guest (workspace_viewer): canManageWorkspace=false, canManageMembers=false, canCreateWork=false, canEditWork=false
 */
import { useMemo } from 'react';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { normalizePlatformRole } from '@/types/roles';
import type { PlatformRole } from '@/types/roles';
import { mapRoleToAccessLevel } from '@/utils/workspace-access-levels';

export interface WorkspacePermissions {
  // Platform role
  platformRole: PlatformRole | null;

  // Workspace access level (UI labels: Owner, Member, Guest)
  workspaceAccessLevel: 'Owner' | 'Member' | 'Guest' | null;

  // Workspace access level (internal)
  workspacePermission: 'owner' | 'editor' | 'viewer' | null;

  // Capability flags
  canManageWorkspace: boolean;
  canManageMembers: boolean;
  canCreateWork: boolean;
  canEditWork: boolean;
  isReadOnly: boolean;
}

/**
 * PROMPT 6: Get workspace permissions based on workspace role and platform role
 *
 * Rules:
 * - workspace_owner → Owner (all capabilities true)
 * - workspace_member → Member (canCreateWork, canEditWork true)
 * - workspace_viewer → Guest (all capabilities false)
 * - Platform ADMIN has implicit workspace_owner access
 * - PROMPT 6 D1: Guest users (PlatformRole.VIEWER) are forced to Guest workspace access
 */
export function useWorkspacePermissions(): WorkspacePermissions {
  const { workspaceRole } = useWorkspaceStore();
  const { user } = useAuth();

  return useMemo(() => {
    // Get platform role
    const platformRole = user?.role ? normalizePlatformRole(user.role) : null;

    // PROMPT 6 D1: Hard rule - If platformRole is Guest, force Guest workspace access
    if (platformRole === 'VIEWER') {
      return {
        platformRole: 'VIEWER',
        workspaceAccessLevel: 'Guest',
        workspacePermission: 'viewer',
        canManageWorkspace: false,
        canManageMembers: false,
        canCreateWork: false,
        canEditWork: false,
        isReadOnly: true,
      };
    }

    // If no workspace role, return all false
    if (!workspaceRole) {
      return {
        platformRole,
        workspaceAccessLevel: null,
        workspacePermission: null,
        canManageWorkspace: false,
        canManageMembers: false,
        canCreateWork: false,
        canEditWork: false,
        isReadOnly: true,
      };
    }

    // Map workspace role to permission level
    // Project-scoped roles (delivery_owner, stakeholder) are NOT workspace permissions
    let workspacePermission: 'owner' | 'editor' | 'viewer';

    if (workspaceRole === 'workspace_owner') {
      workspacePermission = 'owner';
    } else if (workspaceRole === 'workspace_member') {
      workspacePermission = 'editor';
    } else {
      // workspace_viewer, delivery_owner, stakeholder all map to viewer for workspace-level permissions
      workspacePermission = 'viewer';
    }

    // Map to UI access level
    const workspaceAccessLevel = mapRoleToAccessLevel(workspaceRole);

    // Capability flags based on permission level
    const canManageWorkspace = workspacePermission === 'owner';
    const canManageMembers = workspacePermission === 'owner';
    const canCreateWork = workspacePermission === 'owner' || workspacePermission === 'editor';
    const canEditWork = workspacePermission === 'owner' || workspacePermission === 'editor';
    const isReadOnly = workspacePermission === 'viewer';

    return {
      platformRole,
      workspaceAccessLevel,
      workspacePermission,
      canManageWorkspace,
      canManageMembers,
      canCreateWork,
      canEditWork,
      isReadOnly,
    };
  }, [workspaceRole, user?.role]);
}
