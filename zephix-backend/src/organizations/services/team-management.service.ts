import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserOrganization } from '../entities/user-organization.entity';
import { Organization } from '../entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { TeamMemberResponseDto, UpdateMemberRoleDto } from '../dto';

@Injectable()
export class TeamManagementService {
  constructor(
    @InjectRepository(UserOrganization)
    private userOrganizationRepository: Repository<UserOrganization>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getTeamMembers(organizationId: string, userId: string): Promise<TeamMemberResponseDto[]> {
    // Verify user belongs to organization
    const userOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId, userId, isActive: true },
    });

    if (!userOrg) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const teamMembers = await this.userOrganizationRepository.find({
      where: { organizationId, isActive: true },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });

    return teamMembers.map(member => ({
      id: member.id,
      user: {
        id: member.user.id,
        email: member.user.email,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
      },
      role: member.role,
      status: member.isActive ? 'active' : 'inactive',
      joinedAt: member.joinedAt,
    }));
  }

  async updateMemberRole(
    organizationId: string,
    memberId: string,
    updateRoleDto: UpdateMemberRoleDto,
    updaterUserId: string,
  ): Promise<TeamMemberResponseDto> {
    // Verify updater has permission
    const updaterUserOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId, userId: updaterUserId, isActive: true },
    });

    if (!updaterUserOrg || !updaterUserOrg.isAdmin()) {
      throw new ForbiddenException('Only organization admins can update member roles');
    }

    // Find the member to update
    const memberUserOrg = await this.userOrganizationRepository.findOne({
      where: { id: memberId, organizationId },
      relations: ['user'],
    });

    if (!memberUserOrg) {
      throw new NotFoundException('Team member not found');
    }

    // Prevent changing owner role or changing to owner
    if (memberUserOrg.role === 'owner') {
      throw new ForbiddenException('Cannot change the role of an organization owner');
    }

    // Note: owner role is not part of the UpdateMemberRoleDto enum, so this check is not needed
    // The DTO validation will prevent 'owner' from being passed

    // Prevent non-owners from changing admin roles
    if (memberUserOrg.role === 'admin' && !updaterUserOrg.isOwner()) {
      throw new ForbiddenException('Only organization owners can change admin roles');
    }

    // Update the role
    memberUserOrg.role = updateRoleDto.role;
    await this.userOrganizationRepository.save(memberUserOrg);

    return {
      id: memberUserOrg.id,
      user: {
        id: memberUserOrg.user.id,
        email: memberUserOrg.user.email,
        firstName: memberUserOrg.user.firstName,
        lastName: memberUserOrg.user.lastName,
      },
      role: memberUserOrg.role,
      status: memberUserOrg.isActive ? 'active' : 'inactive',
      joinedAt: memberUserOrg.joinedAt,
    };
  }

  async removeMember(
    organizationId: string,
    memberId: string,
    removerUserId: string,
  ): Promise<{ success: boolean }> {
    // Verify remover has permission
    const removerUserOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId, userId: removerUserId, isActive: true },
    });

    if (!removerUserOrg || !removerUserOrg.isAdmin()) {
      throw new ForbiddenException('Only organization admins can remove team members');
    }

    // Find the member to remove
    const memberUserOrg = await this.userOrganizationRepository.findOne({
      where: { id: memberId, organizationId },
      relations: ['user'],
    });

    if (!memberUserOrg) {
      throw new NotFoundException('Team member not found');
    }

    // Prevent removing organization owner
    if (memberUserOrg.role === 'owner') {
      throw new ForbiddenException('Cannot remove organization owner');
    }

    // Prevent non-owners from removing admins
    if (memberUserOrg.role === 'admin' && !removerUserOrg.isOwner()) {
      throw new ForbiddenException('Only organization owners can remove admins');
    }

    // Prevent self-removal (use a separate endpoint for leaving organization)
    if (memberUserOrg.userId === removerUserId) {
      throw new ForbiddenException('Use the leave organization endpoint to remove yourself');
    }

    // Check if this is the last admin (excluding owner)
    const adminCount = await this.userOrganizationRepository.count({
      where: {
        organizationId,
        role: 'admin',
        isActive: true,
      },
    });

    const ownerCount = await this.userOrganizationRepository.count({
      where: {
        organizationId,
        role: 'owner',
        isActive: true,
      },
    });

    if (memberUserOrg.role === 'admin' && adminCount === 1 && ownerCount === 0) {
      throw new ConflictException('Cannot remove the last admin from the organization');
    }

    // Deactivate the member (soft delete)
    memberUserOrg.isActive = false;
    await this.userOrganizationRepository.save(memberUserOrg);

    return { success: true };
  }

  async leaveOrganization(
    organizationId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const userOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId, userId, isActive: true },
    });

    if (!userOrg) {
      throw new NotFoundException('You are not a member of this organization');
    }

    // Prevent owner from leaving if there are other members
    if (userOrg.role === 'owner') {
      const otherMembersCount = await this.userOrganizationRepository
        .createQueryBuilder('uo')
        .where('uo.organizationId = :organizationId', { organizationId })
        .andWhere('uo.isActive = :isActive', { isActive: true })
        .andWhere('uo.userId != :userId', { userId })
        .getCount();

      if (otherMembersCount > 0) {
        throw new ForbiddenException(
          'Organization owner cannot leave while there are other members. Transfer ownership or remove other members first.',
        );
      }
    }

    // Check if this is the last admin
    if (userOrg.role === 'admin') {
      const adminCount = await this.userOrganizationRepository.count({
        where: {
          organizationId,
          role: 'admin',
          isActive: true,
        },
      });

      const ownerCount = await this.userOrganizationRepository.count({
        where: {
          organizationId,
          role: 'owner',
          isActive: true,
        },
      });

      if (adminCount === 1 && ownerCount === 0) {
        throw new ConflictException('Cannot leave as the last admin. Assign another admin first.');
      }
    }

    // Deactivate membership
    userOrg.isActive = false;
    await this.userOrganizationRepository.save(userOrg);

    return { success: true };
  }

  async transferOwnership(
    organizationId: string,
    newOwnerUserId: string,
    currentOwnerUserId: string,
  ): Promise<{ success: boolean }> {
    // Verify current user is owner
    const currentOwnerOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId, userId: currentOwnerUserId, isActive: true },
    });

    if (!currentOwnerOrg || !currentOwnerOrg.isOwner()) {
      throw new ForbiddenException('Only organization owner can transfer ownership');
    }

    // Verify new owner is a member
    const newOwnerOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId, userId: newOwnerUserId, isActive: true },
    });

    if (!newOwnerOrg) {
      throw new NotFoundException('New owner must be a current member of the organization');
    }

    // Transfer ownership
    currentOwnerOrg.role = 'admin';
    newOwnerOrg.role = 'owner';

    await this.userOrganizationRepository.save([currentOwnerOrg, newOwnerOrg]);

    return { success: true };
  }
}
