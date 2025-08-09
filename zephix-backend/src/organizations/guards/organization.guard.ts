import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserOrganization } from '../entities/user-organization.entity';

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(
    @InjectRepository(UserOrganization)
    private userOrganizationRepository: Repository<UserOrganization>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Extract organizationId from various sources
    let organizationId =
      request.params?.organizationId ||
      request.body?.organizationId ||
      request.query?.organizationId ||
      request.headers['x-organization-id'];

    // If no organizationId provided, try to get user's default organization
    if (!organizationId) {
      const defaultUserOrg = await this.userOrganizationRepository.findOne({
        where: { userId: user.id, isActive: true },
        order: { createdAt: 'ASC' }, // Get the first organization the user joined
      });

      if (!defaultUserOrg) {
        throw new ForbiddenException('User is not a member of any organization');
      }

      organizationId = defaultUserOrg.organizationId;
    }

    // Validate user belongs to the organization
    const userOrganization = await this.userOrganizationRepository.findOne({
      where: {
        userId: user.id,
        organizationId,
        isActive: true,
      },
      relations: ['organization'],
    });

    if (!userOrganization) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    if (!userOrganization.organization.isActive()) {
      throw new ForbiddenException('Organization is not active');
    }

    // Inject organization context into request
    request.organizationId = organizationId;
    request.userOrganization = userOrganization;
    request.organizationRole = userOrganization.role;

    return true;
  }
}
