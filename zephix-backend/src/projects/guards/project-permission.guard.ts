import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { TeamMember } from '../entities/team-member.entity';
import { RoleType } from '../entities/role.entity';
// Access control tokens removed - using built-in NestJS guards instead
const TEAM_MEMBER_READ = 'team_member:read';

@Injectable()
export class ProjectPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(TEAM_MEMBER_READ) private teamMemberRepository: Repository<TeamMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<RoleType[]>(
      'projectPermissions',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true; // No specific permissions required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const projectId = request.params.projectId || request.params.id;

    if (!projectId) {
      throw new ForbiddenException('Project ID not found in request');
    }

    // Check if user is a member of the project team with required permissions
    const teamMember = await this.teamMemberRepository.findOne({
      where: {
        userId: user.id,
        team: { projectId },
      },
      relations: ['role', 'team'],
    });

    if (!teamMember) {
      throw new ForbiddenException('You are not a member of this project team');
    }

    const hasPermission = requiredPermissions.includes(teamMember.role.name);
    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
