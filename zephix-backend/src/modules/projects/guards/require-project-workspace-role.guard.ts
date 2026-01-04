import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import {
  REQUIRE_WORKSPACE_ROLE_KEY,
  RequireWorkspaceRoleOptions,
} from '../../workspaces/decorators/require-workspace-role.decorator';
import { WorkspaceRole } from '../../workspaces/entities/workspace.entity';
import { Project } from '../entities/project.entity';

@Injectable()
export class RequireProjectWorkspaceRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private accessService: WorkspaceAccessService,
    private configService: ConfigService,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Get metadata from decorator
    const metadata = this.reflector.get<
      {
        requiredRole: WorkspaceRole;
      } & RequireWorkspaceRoleOptions
    >(REQUIRE_WORKSPACE_ROLE_KEY, context.getHandler());

    if (!metadata) {
      return true; // No role requirement
    }

    const { requiredRole, allowAdminOverride = true } = metadata;

    const organizationId = user.organizationId;
    const userId = user.id || user.sub;
    const userRole = user.role;

    if (!organizationId || !userId) {
      throw new ForbiddenException('User context required');
    }

    // Check feature flag
    const featureEnabled =
      this.configService.get<string>('ZEPHIX_WS_MEMBERSHIP_V1') === '1';

    // If feature flag is OFF, allow request (backwards compatibility)
    if (!featureEnabled) {
      return true;
    }

    // Check if user is org admin
    const isAdmin = userRole === 'admin' || userRole === 'owner';

    // If admin override is enabled and user is admin, allow
    if (allowAdminOverride && isAdmin) {
      return true;
    }

    // Extract workspace ID
    let workspaceId: string | undefined;

    // For POST (create), workspaceId comes from request body
    if (request.method === 'POST') {
      workspaceId = request.body?.workspaceId;
    }
    // For PATCH/DELETE (update/delete), get workspaceId from project
    else if (request.method === 'PATCH' || request.method === 'DELETE') {
      const projectId = request.params.id;
      if (projectId) {
        const project = await this.projectRepo.findOne({
          where: { id: projectId, organizationId },
          select: ['id', 'workspaceId', 'organizationId'],
        });

        if (!project) {
          throw new ForbiddenException('Project not found or access denied');
        }

        if (project.organizationId !== organizationId) {
          throw new ForbiddenException(
            'Project does not belong to your organization',
          );
        }

        workspaceId = project.workspaceId;
      }
    }

    if (!workspaceId) {
      throw new ForbiddenException('Workspace ID required');
    }

    // Get user's workspace role
    const actualRole = await this.accessService.getUserWorkspaceRole(
      organizationId,
      workspaceId,
      userId,
      userRole,
    );

    // If no membership and not admin, deny
    if (!actualRole) {
      throw new ForbiddenException(
        `Access denied. Required workspace role: ${requiredRole}, but you are not a member of this workspace.`,
      );
    }

    // Check if actual role satisfies required role
    const hasAccess = this.accessService.hasWorkspaceRoleAtLeast(
      requiredRole,
      actualRole,
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        `Insufficient workspace permissions. Required role: ${requiredRole}, your role: ${actualRole}`,
      );
    }

    // Attach workspace role to request for use in controllers
    request.workspaceRole = actualRole;

    return true;
  }
}
