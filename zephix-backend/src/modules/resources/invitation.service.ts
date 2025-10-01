import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resource } from './entities/resource.entity';
import { EmailService } from '../../shared/services/email.service';
import { JwtService } from '@nestjs/jwt';

export interface InviteResourceDto {
  email: string;
  name: string;
  organizationId: string;
  resourceType?: 'full_member' | 'guest' | 'external';
  weeklyCapacity?: number;
  message?: string;
}

@Injectable()
export class InvitationService {
  constructor(
    @InjectRepository(Resource)
    private resourceRepository: Repository<Resource>,
    private emailService: EmailService,
    private jwtService: JwtService,
  ) {}

  async inviteResource(dto: InviteResourceDto, invitedBy: string): Promise<Resource> {
    // Check if resource already exists
    const existing = await this.resourceRepository.findOne({
      where: { email: dto.email, organizationId: dto.organizationId }
    });

    if (existing) {
      if (existing.invitationStatus === 'accepted') {
        throw new ConflictException('Resource already exists and is active');
      }
      // Resend invitation
      return this.resendInvitation(existing.id, invitedBy);
    }

    // Create pending resource
    const resource = this.resourceRepository.create({
      name: dto.name,
      email: dto.email,
      resourceType: dto.resourceType || 'full_member',
      requiresAccount: dto.resourceType !== 'external',
      invitationStatus: dto.resourceType === 'external' ? null : 'pending',
      invitedBy,
      invitedAt: new Date(),
      organizationId: dto.organizationId,
      capacityHoursPerWeek: dto.weeklyCapacity || 40,
      role: dto.resourceType === 'external' ? 'External' : 'Team Member',
    });

    const savedResource = await this.resourceRepository.save(resource);

    // Send invitation email if not external
    if (dto.resourceType !== 'external') {
      await this.sendInvitationEmail(savedResource, dto.message);
    }

    return savedResource;
  }

  async resendInvitation(resourceId: string, invitedBy: string): Promise<Resource> {
    const resource = await this.resourceRepository.findOne({
      where: { id: resourceId }
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    if (resource.invitationStatus === 'accepted') {
      throw new ConflictException('Resource has already accepted the invitation');
    }

    // Update invitation details
    resource.invitedBy = invitedBy;
    resource.invitedAt = new Date();
    resource.invitationStatus = 'pending';

    const updatedResource = await this.resourceRepository.save(resource);

    // Resend invitation email
    if (resource.requiresAccount) {
      await this.sendInvitationEmail(updatedResource);
    }

    return updatedResource;
  }

  async acceptInvitation(token: string): Promise<Resource> {
    try {
      // Decode invitation token
      const payload = this.jwtService.verify(token);
      
      const resource = await this.resourceRepository.findOne({
        where: { id: payload.resourceId }
      });

      if (!resource || resource.invitationStatus !== 'pending') {
        throw new BadRequestException('Invalid or expired invitation');
      }

      // Update resource status
      resource.invitationStatus = 'accepted';
      resource.acceptedAt = new Date();
      
      return this.resourceRepository.save(resource);
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new BadRequestException('Invalid or expired invitation token');
      }
      throw error;
    }
  }

  async declineInvitation(token: string): Promise<Resource> {
    try {
      // Decode invitation token
      const payload = this.jwtService.verify(token);
      
      const resource = await this.resourceRepository.findOne({
        where: { id: payload.resourceId }
      });

      if (!resource || resource.invitationStatus !== 'pending') {
        throw new BadRequestException('Invalid or expired invitation');
      }

      // Update resource status
      resource.invitationStatus = 'declined';
      
      return this.resourceRepository.save(resource);
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new BadRequestException('Invalid or expired invitation token');
      }
      throw error;
    }
  }

  async getPendingInvitations(organizationId: string): Promise<Resource[]> {
    return this.resourceRepository.find({
      where: { 
        organizationId, 
        invitationStatus: 'pending' 
      },
      order: { invitedAt: 'DESC' }
    });
  }

  private async sendInvitationEmail(resource: Resource, message?: string): Promise<void> {
    const token = this.jwtService.sign(
      { resourceId: resource.id, email: resource.email },
      { expiresIn: '7d' }
    );

    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/accept?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Project Invitation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table align="center" width="600" style="margin: 20px auto; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #5850EC 0%, #6366F1 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: white; font-size: 28px;">You're Invited to Join!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #1F2937;">Project Team Invitation</h2>
              <p style="margin: 0 0 20px; color: #4B5563; font-size: 16px;">
                You have been invited to join as a <strong>${resource.resourceType.replace('_', ' ')}</strong>.
              </p>
              ${message ? `<p style="margin: 0 0 20px; color: #4B5563; font-style: italic;">"${message}"</p>` : ''}
              <p style="margin: 0 0 30px; color: #4B5563; font-size: 16px;">
                Click the button below to accept the invitation and start collaborating.
              </p>
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 6px; background: #5850EC;">
                    <a href="${inviteUrl}" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 600; color: white; text-decoration: none;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 10px; color: #6B7280; font-size: 14px;">
                Or copy this link: ${inviteUrl}
              </p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                This invitation expires in 7 days. If you didn't expect this invitation, please ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await this.emailService.sendEmail({
      to: resource.email,
      subject: `You're invited to join a project team`,
      html
    });
  }
}

