import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserWorkspace, WorkspaceRole } from '../../workspaces/entities/user-workspace.entity';
import { AuditLog, AuditAction, ResourceType } from '../../audit/entities/audit-log.entity';
import { AuditService } from '../../audit/audit.service';

export interface PermissionRequirement {
  resource: string;
  action: string;
  requireOwnership?: boolean;
  requireTeamMembership?: boolean;
  requireWorkspaceRole?: WorkspaceRole[];
}

export const PERMISSION_KEY = 'permissions';
export const RequirePermission = (requirement: PermissionRequirement) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(PERMISSION_KEY, requirement, descriptor.value);
    return descriptor;
  };
};

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private auditService: AuditService,
    @InjectRepository(UserWorkspace)
    private userWorkspaceRepository: Repository<UserWorkspace>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.get<PermissionRequirement>(
      PERMISSION_KEY,
      context.getHandler(),
    );

    if (!requirement) {
      return true; // No permission requirement
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Get user's workspace role
    const workspaceRole = await this.getUserWorkspaceRole(user.id, request.workspaceId);
    if (!workspaceRole) {
      throw new ForbiddenException('User not authorized for this workspace');
    }

    // Check permission
    const hasPermission = await this.checkPermission(requirement, user, workspaceRole, request);
    
    if (!hasPermission) {
      // Log failed permission attempt
      await this.auditService.log({
        userId: user.id,
        organizationId: user.organizationId,
        workspaceId: request.workspaceId,
        action: AuditAction.PERMISSION_REVOKE,
        result: 'failure',
        resourceType: ResourceType.PERMISSION,
        resourceId: `${requirement.resource}:${requirement.action}`,
        description: `Permission denied: ${requirement.resource}:${requirement.action}`,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      throw new ForbiddenException(
        `Insufficient permissions: ${requirement.resource}:${requirement.action}`,
      );
    }

    // Log successful permission check
    await this.auditService.log({
      userId: user.id,
      organizationId: user.organizationId,
      workspaceId: request.workspaceId,
      action: AuditAction.PERMISSION_GRANT,
      result: 'success',
      resourceType: ResourceType.PERMISSION,
      resourceId: `${requirement.resource}:${requirement.action}`,
      description: `Permission granted: ${requirement.resource}:${requirement.action}`,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return true;
  }

  private async getUserWorkspaceRole(userId: string, workspaceId: string): Promise<UserWorkspace | null> {
    try {
      // Real database query to get user's workspace role
      const userWorkspace = await this.userWorkspaceRepository.findOne({
        where: {
          userId,
          workspaceId,
          isActive: true,
        },
      });

      return userWorkspace;
    } catch (error) {
      console.error('Failed to get user workspace role:', error);
      return null;
    }
  }

  private async checkPermission(
    requirement: PermissionRequirement,
    user: any,
    workspaceRole: UserWorkspace,
    request: any,
  ): Promise<boolean> {
    // Check workspace role requirement
    if (requirement.requireWorkspaceRole) {
      if (!requirement.requireWorkspaceRole.includes(workspaceRole.role)) {
        return false;
      }
    }

    // Check specific permissions based on resource and action
    switch (requirement.resource) {
      case 'project':
        return this.checkProjectPermission(requirement.action, workspaceRole, user, request);
      case 'task':
        return this.checkTaskPermission(requirement.action, workspaceRole, user, request);
      case 'team':
        return this.checkTeamPermission(requirement.action, workspaceRole, user, request);
      case 'resource':
        return this.checkResourcePermission(requirement.action, workspaceRole, user, request);
      case 'workspace':
        return this.checkWorkspacePermission(requirement.action, workspaceRole, user, request);
      case 'user':
        return this.checkUserPermission(requirement.action, workspaceRole, user, request);
      default:
        return false;
    }
  }

  private checkProjectPermission(action: string, workspaceRole: UserWorkspace, user: any, request: any): boolean {
    switch (action) {
      case 'create':
        return workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      case 'read':
        return workspaceRole.role === WorkspaceRole.MEMBER || workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      case 'update':
        return workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      case 'delete':
        return workspaceRole.role === WorkspaceRole.OWNER;
      case 'assign':
        return workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      default:
        return false;
    }
  }

  private checkTaskPermission(action: string, workspaceRole: UserWorkspace, user: any, request: any): boolean {
    switch (action) {
      case 'create':
        return workspaceRole.role === WorkspaceRole.MEMBER || workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      case 'read':
        return workspaceRole.role === WorkspaceRole.MEMBER || workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      case 'update':
        return workspaceRole.role === WorkspaceRole.MEMBER || workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      case 'delete':
        return workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      case 'assign':
        return workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      case 'complete':
        return workspaceRole.role === WorkspaceRole.MEMBER || workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      default:
        return false;
    }
  }

  private checkTeamPermission(action: string, workspaceRole: UserWorkspace, user: any, request: any): boolean {
    switch (action) {
      case 'create':
        return workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      case 'read':
        return workspaceRole.role === WorkspaceRole.MEMBER || workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      case 'update':
        return workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      case 'delete':
        return workspaceRole.role === WorkspaceRole.OWNER;
      case 'manage_members':
        return workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      default:
        return false;
    }
  }

  private checkResourcePermission(action: string, workspaceRole: UserWorkspace, user: any, request: any): boolean {
    switch (action) {
      case 'read':
        return workspaceRole.role === WorkspaceRole.MEMBER || workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      case 'update':
        return workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      case 'allocate':
        return workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      case 'deallocate':
        return workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      default:
        return false;
    }
  }

  private checkWorkspacePermission(action: string, workspaceRole: UserWorkspace, user: any, request: any): boolean {
    switch (action) {
      case 'read':
        return workspaceRole.role === WorkspaceRole.MEMBER || workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      case 'update':
        return workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      case 'delete':
        return workspaceRole.role === WorkspaceRole.OWNER;
      case 'invite':
        return workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      case 'remove_user':
        return workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      case 'manage':
        return workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      default:
        return false;
    }
  }

  private checkUserPermission(action: string, workspaceRole: UserWorkspace, user: any, request: any): boolean {
    switch (action) {
      case 'read':
        return workspaceRole.role === WorkspaceRole.MEMBER || workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      case 'update':
        return workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      case 'delete':
        return workspaceRole.role === WorkspaceRole.OWNER;
      case 'invite':
        return workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      case 'remove':
        return workspaceRole.role === WorkspaceRole.ADMIN || workspaceRole.role === WorkspaceRole.OWNER;
      default:
        return false;
    }
  }
}
