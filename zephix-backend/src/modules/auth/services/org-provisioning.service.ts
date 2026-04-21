/**
 * OrgProvisioningService — post-signup per-organization setup.
 *
 * Called after signup transaction completes. Creates:
 *   1. User settings row (eager, not lazy)
 *   2. Onboarding state initialization
 *
 * Workspace creation is handled by the onboarding flow — user chooses
 * their own workspace name instead of getting a generic auto-created one.
 *
 * Idempotent: checks before creating. Calling twice does nothing harmful.
 * Non-blocking: signup succeeds even if provisioning fails.
 */
import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UserSettings } from '../../users/entities/user-settings.entity';
import { AuditService } from '../../audit/services/audit.service';
import { AuditAction, AuditEntityType } from '../../audit/audit.constants';

export interface ProvisioningResult {
  organizationId: string;
  userSettingsCreated: boolean;
  onboardingInitialized: boolean;
}

@Injectable()
export class OrgProvisioningService {
  private readonly logger = new Logger(OrgProvisioningService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Optional()
    @InjectRepository(UserSettings)
    private readonly userSettingsRepo: Repository<UserSettings> | null,
    @Optional()
    private readonly auditService?: AuditService,
  ) {}

  /**
   * Provision everything a new organization needs to function.
   * Non-throwing: logs errors but never fails the caller.
   */
  async provisionNewOrganization(params: {
    organizationId: string;
    userId: string;
    userName: string;
    organizationName: string;
  }): Promise<ProvisioningResult> {
    const { organizationId, userId } = params;
    const result: ProvisioningResult = {
      organizationId,
      userSettingsCreated: false,
      onboardingInitialized: false,
    };

    this.logger.log(
      `Provisioning org ${organizationId} ("${params.organizationName}") for user ${userId}`,
    );

    // Workspace creation is handled by the onboarding flow — user chooses
    // their own workspace name instead of getting a generic auto-created one.

    // 1. User settings
    try {
      result.userSettingsCreated = await this.ensureUserSettings(userId, organizationId);
    } catch (err) {
      this.logger.warn(`User settings provisioning failed: ${(err as Error).message}`);
    }

    // 2. Onboarding state
    try {
      result.onboardingInitialized = await this.initializeOnboarding(userId);
    } catch (err) {
      this.logger.warn(`Onboarding init failed: ${(err as Error).message}`);
    }

    // 3. Audit event (best-effort)
    try {
      await this.auditService?.record({
        action: AuditAction.GOVERNANCE_EVALUATE,
        entityType: AuditEntityType.ORGANIZATION,
        entityId: organizationId,
        organizationId,
        actorUserId: userId,
        actorPlatformRole: 'ADMIN',
        after: {
          event: 'org.provisioned',
          userSettingsCreated: result.userSettingsCreated,
          onboardingInitialized: result.onboardingInitialized,
        },
      });
    } catch {
      // Audit failure is never blocking
    }

    this.logger.log(
      `Provisioning complete: settings=${result.userSettingsCreated}, ` +
      `onboarding=${result.onboardingInitialized}`,
    );

    return result;
  }

  /**
   * Eagerly create user_settings row so Preferences page loads instantly.
   */
  private async ensureUserSettings(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    if (!this.userSettingsRepo) return false;

    const existing = await this.userSettingsRepo.findOne({
      where: { userId, organizationId },
    });
    if (existing) return false;

    const row = this.userSettingsRepo.create({
      userId,
      organizationId,
      preferences: {},
      notifications: {},
      theme: 'light',
    });
    await this.userSettingsRepo.save(row);
    return true;
  }

  /**
   * Set the founding user's onboarding status to 'not_started'
   * so the onboarding guard picks them up on first login.
   */
  private async initializeOnboarding(userId: string): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return false;

    if (user.onboardingStatus && user.onboardingStatus !== 'not_started') {
      return false;
    }

    user.onboardingStatus = 'not_started';
    await this.userRepo.save(user);
    return true;
  }
}
