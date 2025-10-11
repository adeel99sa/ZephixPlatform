import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invitation, InvitationStatus } from '../entities/invitation.entity';
import { UsersService } from '../../users/users.service';
import * as crypto from 'crypto';

@Injectable()
export class InvitationService {
  constructor(
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    private usersService: UsersService,
  ) {}

  async createInvitation(email: string, role: string, organizationId: string, invitedBy: string) {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser && existingUser.organizationId === organizationId) {
      throw new ConflictException('User already exists in this organization');
    }

    // Check if pending invitation already exists
    const existingInvitation = await this.invitationRepository.findOne({
      where: { email, organizationId, status: InvitationStatus.PENDING }
    });

    if (existingInvitation) {
      // Update existing invitation
      existingInvitation.role = role;
      existingInvitation.invitedBy = invitedBy;
      existingInvitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      return await this.invitationRepository.save(existingInvitation);
    }

    // Create new invitation
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = this.invitationRepository.create({
      email,
      role,
      organizationId,
      invitedBy,
      token,
      expiresAt,
      status: InvitationStatus.PENDING
    });

    return await this.invitationRepository.save(invitation);
  }

  async getInvitationsByOrganization(organizationId: string) {
    return this.invitationRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' }
    });
  }

  async getInvitationByToken(token: string) {
    const invitation = await this.invitationRepository.findOne({
      where: { token, status: InvitationStatus.PENDING }
    });

    if (!invitation) {
      throw new NotFoundException('Invalid or expired invitation');
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      throw new NotFoundException('Invitation has expired');
    }

    return invitation;
  }

  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.getInvitationByToken(token);
    
    invitation.status = InvitationStatus.ACCEPTED;
    await this.invitationRepository.save(invitation);

    return invitation;
  }

  async cancelInvitation(invitationId: string, organizationId: string) {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId, organizationId }
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    invitation.status = InvitationStatus.CANCELLED;
    return await this.invitationRepository.save(invitation);
  }

  async getPendingCount(organizationId: string) {
    return this.invitationRepository.count({
      where: { organizationId, status: InvitationStatus.PENDING }
    });
  }
}











