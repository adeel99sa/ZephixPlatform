import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';

/**
 * Helper to validate workspace access for resource operations.
 *
 * Rules:
 * - If workspaceId is provided (via header or context), validate user has access
 * - If workspaceId is missing on workspace-scoped endpoints, return 403
 * - If workspaceId doesn't belong to org, return 403 (not 404)
 */
export class WorkspaceScopeHelper {
  /**
   * Get and validate workspaceId for workspace-scoped operations
   *
   * @param tenantContextService - Tenant context service
   * @param workspaceAccessService - Workspace access service
   * @param organizationId - User's organization ID
   * @param userId - User ID
   * @param platformRole - User's platform role
   * @param required - If true, workspaceId is required (returns 403 if missing)
   * @returns WorkspaceId if valid, undefined if not required and missing
   * @throws ForbiddenException if workspaceId is required but missing or invalid
   */
  static async getValidatedWorkspaceId(
    tenantContextService: TenantContextService,
    workspaceAccessService: WorkspaceAccessService,
    organizationId: string,
    userId: string,
    platformRole: string,
    required: boolean = false,
  ): Promise<string | undefined> {
    // Get workspaceId from tenant context (set by interceptor from x-workspace-id header)
    const workspaceId = tenantContextService.getWorkspaceId();

    if (!workspaceId) {
      if (required) {
        throw new ForbiddenException(
          'Workspace ID is required. Include x-workspace-id header.',
        );
      }
      return undefined;
    }

    // Validate workspace access
    const canAccess = await workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      platformRole,
    );

    if (!canAccess) {
      throw new ForbiddenException(
        'Workspace does not belong to your organization or you do not have access',
      );
    }

    return workspaceId;
  }

  /**
   * Validate that a resource belongs to the workspace (if workspace-scoped)
   *
   * @param resourceWorkspaceId - WorkspaceId from the resource entity
   * @param requestedWorkspaceId - WorkspaceId from request context
   * @param required - If true, workspace scoping is required
   * @throws ForbiddenException if workspace mismatch
   */
  static validateResourceWorkspace(
    resourceWorkspaceId: string | null | undefined,
    requestedWorkspaceId: string | undefined,
    required: boolean = false,
  ): void {
    // If workspace is required but resource has no workspace, that's an error
    if (required && !resourceWorkspaceId) {
      throw new NotFoundException('Resource not found in workspace');
    }

    // If both have workspaceId, they must match
    if (requestedWorkspaceId && resourceWorkspaceId) {
      if (requestedWorkspaceId !== resourceWorkspaceId) {
        throw new ForbiddenException(
          'Resource does not belong to the specified workspace',
        );
      }
    }
  }
}
