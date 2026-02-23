import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { EmailVerificationToken } from '../entities/email-verification-token.entity';
import { AuditService } from '../../audit/services/audit.service';
import { AuditAction, AuditEntityType } from '../../audit/audit.constants';

export interface MarkVerifiedActor {
  organizationId: string;
  actorUserId: string;
  actorPlatformRole: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AdminAuthToolsService {
  private readonly logger = new Logger(AdminAuthToolsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserOrganization)
    private readonly userOrgRepository: Repository<UserOrganization>,
    @InjectRepository(EmailVerificationToken)
    private readonly tokenRepository: Repository<EmailVerificationToken>,
    private readonly auditService: AuditService,
  ) {}

  async markVerifiedByEmail(
    email: string,
    actor: MarkVerifiedActor,
  ): Promise<{ success: boolean; targetUserId?: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    const membership = await this.userOrgRepository
      .createQueryBuilder('uo')
      .innerJoinAndSelect('uo.user', 'u')
      .where('uo.organizationId = :organizationId', {
        organizationId: actor.organizationId,
      })
      .andWhere('uo.isActive = true')
      .andWhere('LOWER(u.email) = :normalizedEmail', { normalizedEmail })
      .getOne();

    if (!membership?.user) {
      await this.auditService.record({
        organizationId: actor.organizationId,
        actorUserId: actor.actorUserId,
        actorPlatformRole: actor.actorPlatformRole,
        entityType: AuditEntityType.USER,
        entityId: actor.actorUserId,
        action: AuditAction.EMAIL_VERIFIED,
        metadata: {
          source: 'staging_admin_mark_verified',
          targetEmail: normalizedEmail,
          success: false,
        },
        ipAddress: actor.ipAddress ?? null,
        userAgent: actor.userAgent ?? null,
      });

      return { success: false };
    }

    const targetUser = membership.user;
    const now = new Date();

    if (!targetUser.isEmailVerified) {
      await this.userRepository.update(targetUser.id, {
        isEmailVerified: true,
        emailVerifiedAt: now,
      });
    }

    await this.tokenRepository
      .createQueryBuilder()
      .update(EmailVerificationToken)
      .set({ usedAt: now })
      .where('user_id = :userId', { userId: targetUser.id })
      .andWhere('used_at IS NULL')
      .execute();

    await this.auditService.record({
      organizationId: actor.organizationId,
      actorUserId: actor.actorUserId,
      actorPlatformRole: actor.actorPlatformRole,
      entityType: AuditEntityType.USER,
      entityId: targetUser.id,
      action: AuditAction.EMAIL_VERIFIED,
      after: {
        isEmailVerified: true,
        emailVerifiedAt: now.toISOString(),
      },
      metadata: {
        source: 'staging_admin_mark_verified',
        targetEmail: normalizedEmail,
        success: true,
      },
      ipAddress: actor.ipAddress ?? null,
      userAgent: actor.userAgent ?? null,
    });

    this.logger.log(
      `Staging admin mark-verified applied | org=${actor.organizationId} targetUserId=${targetUser.id}`,
    );

    return { success: true, targetUserId: targetUser.id };
  }
}
