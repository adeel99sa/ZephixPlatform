import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Invitation } from '../entities/invitation.entity';
import { Organization } from '../entities/organization.entity';
import { UserOrganization } from '../entities/user-organization.entity';
import { User } from '../../users/entities/user.entity';
import { EmailService, InvitationEmailData } from '../../shared/services/email.service';
import { InviteTeamMemberDto, InvitationResponseDto } from '../dto';
import { randomBytes } from 'crypto';

@Injectable()
export class InvitationService {
  constructor(
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private userOrganizationRepository: Repository<UserOrganization>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async inviteTeamMember(
    organizationId: string,
    inviteDto: InviteTeamMemberDto,
    inviterUserId: string,
  ): Promise<{ success: boolean; invitation: InvitationResponseDto }> {
    // Verify inviter has permission
    const inviterUserOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId, userId: inviterUserId, isActive: true },
      relations: ['user', 'organization'],
    });

    if (!inviterUserOrg || !inviterUserOrg.isAdmin()) {
      throw new ForbiddenException('Only organization admins can invite team members');
    }

    // Check if user is already in the organization
    const existingUser = await this.userRepository.findOne({
      where: { email: inviteDto.email },
    });

    if (existingUser) {
      const existingUserOrg = await this.userOrganizationRepository.findOne({
        where: { organizationId, userId: existingUser.id },
      });

      if (existingUserOrg && existingUserOrg.isActive) {
        throw new ConflictException('User is already a member of this organization');
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await this.invitationRepository.findOne({
      where: {
        email: inviteDto.email,
        organizationId,
        status: 'pending',
      },
    });

    if (existingInvitation && existingInvitation.isPending()) {
      throw new ConflictException('A pending invitation already exists for this email');
    }

    // Cancel any existing expired/pending invitations
    await this.invitationRepository.update(
      {
        email: inviteDto.email,
        organizationId,
        status: 'pending',
      },
      { status: 'cancelled' },
    );

    // Generate secure invitation token
    const token = this.generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72); // 72 hours expiry

    // Create invitation
    const invitation = this.invitationRepository.create({
      token,
      email: inviteDto.email,
      role: inviteDto.role,
      message: inviteDto.message,
      expiresAt,
      organizationId,
      invitedByUserId: inviterUserId,
      status: 'pending',
    });

    const savedInvitation = await this.invitationRepository.save(invitation);

    // Send invitation email
    try {
      const emailData: InvitationEmailData = {
        recipientEmail: inviteDto.email,
        organizationName: inviterUserOrg.organization.name,
        inviterName: `${inviterUserOrg.user.firstName} ${inviterUserOrg.user.lastName}`,
        invitationToken: token,
        role: inviteDto.role,
        message: inviteDto.message,
        expiresAt,
      };

      await this.emailService.sendInvitationEmail(emailData);
    } catch (error) {
      // If email fails, we should still return success but log the error
      console.error('Failed to send invitation email:', error);
    }

    // Return response
    const response = await this.getInvitationResponseDto(savedInvitation.id);
    return {
      success: true,
      invitation: response,
    };
  }

  async acceptInvitation(token: string, userId?: string): Promise<{
    success: boolean;
    organization: Organization;
    requiresSignup: boolean;
  }> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['organization'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (!invitation.canBeAccepted()) {
      throw new BadRequestException('Invitation has expired or is no longer valid');
    }

    // Check if user exists
    let user = await this.userRepository.findOne({
      where: { email: invitation.email },
    });

    if (!user && !userId) {
      // User needs to sign up first
      return {
        success: false,
        organization: invitation.organization,
        requiresSignup: true,
      };
    }

    if (!user && userId) {
      // Get user by ID (for users who just signed up)
      user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user || user.email !== invitation.email) {
        throw new ForbiddenException('User email does not match invitation');
      }
    }

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Check if user is already in organization
    const existingUserOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId: invitation.organizationId, userId: user.id },
    });

    if (existingUserOrg && existingUserOrg.isActive) {
      // Update invitation status and return success
      invitation.status = 'accepted';
      invitation.acceptedAt = new Date();
      invitation.acceptedByUserId = user.id;
      await this.invitationRepository.save(invitation);

      return {
        success: true,
        organization: invitation.organization,
        requiresSignup: false,
      };
    }

    // Create or reactivate user organization relationship
    if (existingUserOrg) {
      existingUserOrg.isActive = true;
      existingUserOrg.role = invitation.role;
      existingUserOrg.joinedAt = new Date();
      await this.userOrganizationRepository.save(existingUserOrg);
    } else {
      const userOrganization = this.userOrganizationRepository.create({
        userId: user.id,
        organizationId: invitation.organizationId,
        role: invitation.role,
        isActive: true,
        joinedAt: new Date(),
      });
      await this.userOrganizationRepository.save(userOrganization);
    }

    // Update invitation status
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    invitation.acceptedByUserId = user.id;
    await this.invitationRepository.save(invitation);

    return {
      success: true,
      organization: invitation.organization,
      requiresSignup: false,
    };
  }

  async getOrganizationInvitations(organizationId: string, userId: string): Promise<InvitationResponseDto[]> {
    // Verify user has permission to view invitations
    const userOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId, userId, isActive: true },
    });

    if (!userOrg || !userOrg.isAdmin()) {
      throw new ForbiddenException('Only organization admins can view invitations');
    }

    const invitations = await this.invitationRepository.find({
      where: { organizationId },
      relations: ['invitedBy'],
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      invitations.map(invitation => this.getInvitationResponseDto(invitation.id))
    );
  }

  async resendInvitation(invitationId: string, userId: string): Promise<{ success: boolean }> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
      relations: ['organization', 'invitedBy'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Verify user has permission
    const userOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId: invitation.organizationId, userId, isActive: true },
    });

    if (!userOrg || !userOrg.isAdmin()) {
      throw new ForbiddenException('Only organization admins can resend invitations');
    }

    if (!invitation.canBeResent()) {
      throw new BadRequestException('Invitation cannot be resent');
    }

    // Update expiry and regenerate token
    invitation.token = this.generateInvitationToken();
    invitation.expiresAt = new Date();
    invitation.expiresAt.setHours(invitation.expiresAt.getHours() + 72);
    invitation.status = 'pending';

    await this.invitationRepository.save(invitation);

    // Resend email
    try {
      const emailData: InvitationEmailData = {
        recipientEmail: invitation.email,
        organizationName: invitation.organization.name,
        inviterName: `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`,
        invitationToken: invitation.token,
        role: invitation.role,
        message: invitation.message,
        expiresAt: invitation.expiresAt,
      };

      await this.emailService.sendInvitationEmail(emailData);
    } catch (error) {
      console.error('Failed to resend invitation email:', error);
      throw new Error('Failed to resend invitation email');
    }

    return { success: true };
  }

  async cancelInvitation(invitationId: string, userId: string): Promise<{ success: boolean }> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Verify user has permission
    const userOrg = await this.userOrganizationRepository.findOne({
      where: { organizationId: invitation.organizationId, userId, isActive: true },
    });

    if (!userOrg || !userOrg.isAdmin()) {
      throw new ForbiddenException('Only organization admins can cancel invitations');
    }

    invitation.status = 'cancelled';
    await this.invitationRepository.save(invitation);

    return { success: true };
  }

  async getInvitationByToken(token: string): Promise<Invitation | null> {
    return this.invitationRepository.findOne({
      where: { token },
      relations: ['organization'],
    });
  }

  private generateInvitationToken(): string {
    return randomBytes(32).toString('hex');
  }

  private async getInvitationResponseDto(invitationId: string): Promise<InvitationResponseDto> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
      relations: ['invitedBy'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      message: invitation.message,
      expiresAt: invitation.expiresAt,
      invitedBy: {
        id: invitation.invitedBy.id,
        email: invitation.invitedBy.email,
        firstName: invitation.invitedBy.firstName,
        lastName: invitation.invitedBy.lastName,
      },
      createdAt: invitation.createdAt,
    };
  }
}
