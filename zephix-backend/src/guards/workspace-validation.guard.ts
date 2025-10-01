import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserWorkspace } from '../modules/workspaces/entities/user-workspace.entity';

@Injectable()
export class OrganizationValidationGuard implements CanActivate {
  constructor(
    @InjectRepository(UserWorkspace)
    private userWorkspaceRepository: Repository<UserWorkspace>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get workspace from header or user's current workspace
    const workspaceId = request.headers['x-workspace-id'] || user.currentWorkspaceId;
    
    if (!workspaceId) {
      throw new ForbiddenException('No workspace context. Please select a workspace.');
    }

    // Verify user has access to this workspace
    const access = await this.userWorkspaceRepository.findOne({
      where: {
        userId: user.id,
        workspaceId: workspaceId,
        isActive: true
      }
    });

    if (!access) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    // Attach workspace to request for use in controllers
    request.workspaceId = workspaceId;
    request.workspaceRole = access.role;
    
    return true;
  }
}
