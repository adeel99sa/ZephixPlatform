import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../entities/organization.entity';
import { UserOrganization } from '../entities/user-organization.entity';
import { User } from '../../users/entities/user.entity';
import { CreateOrganizationDto, UpdateOrganizationDto, InviteUserDto } from '../dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private userOrganizationRepository: Repository<UserOrganization>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createOrgDto: CreateOrganizationDto, creatorUserId: string): Promise<Organization> {
    // Generate slug if not provided
    let slug = createOrgDto.slug;
    if (!slug) {
      slug = this.generateSlug(createOrgDto.name);
    }

    // Check if slug already exists
    const existingOrg = await this.organizationRepository.findOne({ where: { slug } });
    if (existingOrg) {
      throw new ConflictException('Organization with this slug already exists');
    }

    // Create organization
    const organization = this.organizationRepository.create({
      ...createOrgDto,
      slug,
      trialEndsAt: createOrgDto.trialEndsAt ? new Date(createOrgDto.trialEndsAt) : undefined,
    });

    const savedOrganization = await this.organizationRepository.save(organization);

    // Add creator as owner
    const userOrganization = this.userOrganizationRepository.create({
      userId: creatorUserId,
      organizationId: savedOrganization.id,
      role: 'owner',
      isActive: true,
      joinedAt: new Date(),
    });

    await this.userOrganizationRepository.save(userOrganization);

    return savedOrganization;
  }

  async findByUser(userId: string): Promise<Organization[]> {
    const userOrganizations = await this.userOrganizationRepository.find({
      where: { userId, isActive: true },
      relations: ['organization'],
      order: { createdAt: 'ASC' },
    });

    return userOrganizations
      .map(uo => uo.organization)
      .filter(org => org.isActive());
  }

  async findOne(id: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['userOrganizations', 'userOrganizations.user'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async update(
    id: string,
    updateOrgDto: UpdateOrganizationDto,
    userId: string,
  ): Promise<Organization> {
    // Check if user has permission to update
    const userOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId: id, userId, isActive: true },
    });

    if (!userOrg || !userOrg.isAdmin()) {
      throw new ForbiddenException('Only organization admins can update organization settings');
    }

    const organization = await this.findOne(id);

    // If slug is being updated, check for conflicts
    if (updateOrgDto.slug && updateOrgDto.slug !== organization.slug) {
      const existingOrg = await this.organizationRepository.findOne({
        where: { slug: updateOrgDto.slug },
      });
      if (existingOrg) {
        throw new ConflictException('Organization with this slug already exists');
      }
    }

    Object.assign(organization, updateOrgDto);

    if (updateOrgDto.trialEndsAt) {
      organization.trialEndsAt = new Date(updateOrgDto.trialEndsAt);
    }

    return this.organizationRepository.save(organization);
  }

  async inviteUser(
    organizationId: string,
    inviteDto: InviteUserDto,
    inviterUserId: string,
  ): Promise<{ success: boolean; message: string }> {
    // Check if inviter has permission
    const inviterUserOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId, userId: inviterUserId, isActive: true },
    });

    if (!inviterUserOrg || !inviterUserOrg.isAdmin()) {
      throw new ForbiddenException('Only organization admins can invite users');
    }

    // Check if user already exists
    let user = await this.userRepository.findOne({ where: { email: inviteDto.email } });

    // If user doesn't exist, create a placeholder (they'll complete registration on first login)
    if (!user) {
      user = this.userRepository.create({
        email: inviteDto.email,
        firstName: inviteDto.firstName || '',
        lastName: inviteDto.lastName || '',
        password: '', // Will be set during registration
        isActive: false, // Will be activated when they complete registration
      });
      user = await this.userRepository.save(user);
    }

    // Check if user is already in organization
    const existingUserOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId, userId: user.id },
    });

    if (existingUserOrg) {
      if (existingUserOrg.isActive) {
        throw new ConflictException('User is already a member of this organization');
      } else {
        // Reactivate the user
        existingUserOrg.isActive = true;
        existingUserOrg.role = inviteDto.role;
        await this.userOrganizationRepository.save(existingUserOrg);
        return { success: true, message: 'User invitation reactivated' };
      }
    }

    // Create user organization relationship
    const userOrganization = this.userOrganizationRepository.create({
      userId: user.id,
      organizationId,
      role: inviteDto.role,
      isActive: true,
      joinedAt: new Date(),
    });

    await this.userOrganizationRepository.save(userOrganization);

    // TODO: Send invitation email
    // This would integrate with an email service to send invitation emails

    return { success: true, message: 'User invited successfully' };
  }

  async removeUser(
    organizationId: string,
    userIdToRemove: string,
    removingUserId: string,
  ): Promise<void> {
    // Check if remover has permission
    const removerUserOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId, userId: removingUserId, isActive: true },
    });

    if (!removerUserOrg || !removerUserOrg.isAdmin()) {
      throw new ForbiddenException('Only organization admins can remove users');
    }

    // Can't remove organization owner
    const userToRemove = await this.userOrganizationRepository.findOne({
      where: { organizationId, userId: userIdToRemove, isActive: true },
    });

    if (!userToRemove) {
      throw new NotFoundException('User not found in organization');
    }

    if (userToRemove.isOwner()) {
      throw new ForbiddenException('Cannot remove organization owner');
    }

    // Deactivate instead of delete to preserve audit trail
    userToRemove.isActive = false;
    await this.userOrganizationRepository.save(userToRemove);
  }

  async updateUserRole(
    organizationId: string,
    userIdToUpdate: string,
    newRole: 'admin' | 'pm' | 'viewer',
    updatingUserId: string,
  ): Promise<void> {
    // Check if updater has permission
    const updaterUserOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId, userId: updatingUserId, isActive: true },
    });

    if (!updaterUserOrg || !updaterUserOrg.isAdmin()) {
      throw new ForbiddenException('Only organization admins can update user roles');
    }

    // Find user to update
    const userToUpdate = await this.userOrganizationRepository.findOne({
      where: { organizationId, userId: userIdToUpdate, isActive: true },
    });

    if (!userToUpdate) {
      throw new NotFoundException('User not found in organization');
    }

    if (userToUpdate.isOwner()) {
      throw new ForbiddenException('Cannot change owner role');
    }

    userToUpdate.role = newRole;
    await this.userOrganizationRepository.save(userToUpdate);
  }

  async switchOrganization(userId: string, organizationId: string): Promise<Organization> {
    const userOrg = await this.userOrganizationRepository.findOne({
      where: { userId, organizationId, isActive: true },
      relations: ['organization'],
    });

    if (!userOrg) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    if (!userOrg.organization.isActive()) {
      throw new ForbiddenException('Organization is not active');
    }

    // Update last access time
    userOrg.lastAccessAt = new Date();
    await this.userOrganizationRepository.save(userOrg);

    return userOrg.organization;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
      .substring(0, 100); // Limit length
  }
}
