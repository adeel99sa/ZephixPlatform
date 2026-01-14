/**
 * PHASE 7 MODULE 7.1: WorkItem Permissions Helper
 * Centralized permission checks for work items
 */
import { ForbiddenException } from '@nestjs/common';
import {
  normalizePlatformRole,
  PlatformRole,
  isAdminRole,
} from '../../../shared/enums/platform-roles.enum';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { WorkspaceMember } from '../../workspaces/entities/workspace-member.entity';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { Inject } from '@nestjs/common';

/**
 * Check if user is Guest (VIEWER) - blocks all writes
 */
export function isGuestUser(role: string | null | undefined): boolean {
  const normalized = normalizePlatformRole(role);
  return normalized === PlatformRole.VIEWER;
}

/**
 * Block Guest users from write operations
 */
export function blockGuestWrite(role: string | null | undefined): void {
  if (isGuestUser(role)) {
    throw new ForbiddenException('Forbidden');
  }
}

/**
 * Check if user can edit a work item
 * Rules:
 * - Admin can always edit
 * - Workspace owner can edit any task in workspace
 * - Assignee can edit their assigned tasks
 * - Member can edit if they are workspace_member or workspace_owner
 */
export async function canEditWorkItem(
  workItem: { assigneeId?: string | null; workspaceId: string },
  userId: string,
  userRole: string | null | undefined,
  workspaceAccessService: WorkspaceAccessService,
  workspaceMemberRepo: TenantAwareRepository<WorkspaceMember>,
): Promise<boolean> {
  // Admin can always edit
  if (isAdminRole(userRole)) {
    return true;
  }

  // Block Guest
  if (isGuestUser(userRole)) {
    return false;
  }

  // Check if user is assignee
  if (workItem.assigneeId === userId) {
    return true;
  }

  // Check workspace role (TenantAwareRepository automatically scopes by organizationId)
  const membership = await workspaceMemberRepo.findOne({
    where: { workspaceId: workItem.workspaceId, userId },
  });

  if (!membership) {
    return false;
  }

  // Workspace owner can edit any task
  if (membership.role === 'workspace_owner') {
    return true;
  }

  // Workspace member can edit tasks in their workspace
  if (membership.role === 'workspace_member') {
    return true;
  }

  // Viewer cannot edit
  return false;
}
