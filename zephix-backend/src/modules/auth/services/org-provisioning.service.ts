/**
 * OrgProvisioningService — post-signup per-organization setup.
 *
 * Called after AuthService.signup() or OrganizationSignupService creates the org.
 * Creates everything a new org needs to function:
 *   1. Default workspace (with founder as workspace_owner)
 *   2. User settings row (eager, not lazy)
 *   3. Onboarding state initialization
 *
 * Idempotent: checks before creating. Calling twice does nothing harmful.
 * Non-blocking: signup succeeds even if provisioning fails. Lazy-create
 * patterns fill gaps on subsequent requests.
 */
import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../../workspaces/entities/workspace-member.entity';
import { User } from '../../users/entities/user.entity';
import { UserSettings } from '../../users/entities/user-settings.entity';
import { AuditService } from '../../audit/services/audit.service';
import { AuditAction, AuditEntityType } from '../../audit/audit.constants';

export interface ProvisioningResult {
  organizationId: string;
  workspaceId: string | null;
  workspaceCreated: boolean;
  userSettingsCreated: boolean;
  onboardingInitialized: boolean;
}

@Injectable()
export class OrgProvisioningService {
  private readonly logger = new Logger(OrgProvisioningService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private readonly memberRepo: Repository<WorkspaceMember>,
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
    const { organizationId, userId, userName, organizationName } = params;
    const result: ProvisioningResult = {
      organizationId,
      workspaceId: null,
      workspaceCreated: false,
      userSettingsCreated: false,
      onboardingInitialized: false,
    };

    this.logger.log(
      `Provisioning org ${organizationId} ("${organizationName}") for user ${userId}`,
    );

    // 1. Default workspace
    try {
      const ws = await this.ensureDefaultWorkspace(organizationId, userId, organizationName);
      if (ws) {
        result.workspaceId = ws.id;
        result.workspaceCreated = true;
      }
    } catch (err) {
      this.logger.warn(`Workspace provisioning failed: ${err.message}`);
    }

    // 2. User settings
    try {
      result.userSettingsCreated = await this.ensureUserSettings(userId, organizationId);
    } catch (err) {
      this.logger.warn(`User settings provisioning failed: ${err.message}`);
    }

    // 3. Onboarding state
    try {
      result.onboardingInitialized = await this.initializeOnboarding(userId);
    } catch (err) {
      this.logger.warn(`Onboarding init failed: ${err.message}`);
    }

    // 4. Audit event (best-effort)
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
          workspaceCreated: result.workspaceCreated,
          workspaceId: result.workspaceId,
          userSettingsCreated: result.userSettingsCreated,
          onboardingInitialized: result.onboardingInitialized,
        },
      });
    } catch {
      // Audit failure is never blocking
    }

    this.logger.log(
      `Provisioning complete: workspace=${result.workspaceCreated}, ` +
      `settings=${result.userSettingsCreated}, onboarding=${result.onboardingInitialized}`,
    );

    return result;
  }

  /**
   * Create a default workspace if the org has none.
   * Returns the workspace (existing or new) or null if failed.
   */
  private async ensureDefaultWorkspace(
    organizationId: string,
    userId: string,
    organizationName: string,
  ): Promise<Workspace | null> {
    // Check if any workspace exists for this org
    const existing = await this.workspaceRepo.findOne({
      where: { organizationId },
    });
    if (existing) {
      this.logger.debug(`Org ${organizationId} already has workspace ${existing.id}`);
      return existing;
    }

    // Create workspace + workspace_member in a transaction
    return this.dataSource.transaction(async (manager) => {
      const wsRepo = manager.getRepository(Workspace);
      const memRepo = manager.getRepository(WorkspaceMember);

      const slug = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50) || 'workspace';

      const workspace = wsRepo.create({
        name: `${organizationName}`,
        slug,
        organizationId,
        createdBy: userId,
        isPrivate: false,
      });
      const saved = await wsRepo.save(workspace);

      // Add founder as workspace_owner
      const member = memRepo.create({
        organizationId,
        workspaceId: saved.id,
        userId,
        role: 'workspace_owner',
        status: 'active',
        createdBy: userId,
      });
      await memRepo.save(member);

      this.logger.log(`Created default workspace "${saved.name}" (${saved.id})`);
      return saved;
    });
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
    if (existing) return false; // Already exists

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

    // Only set if not already initialized
    if (user.onboardingStatus && user.onboardingStatus !== 'not_started') {
      return false;
    }

    user.onboardingStatus = 'not_started';
    await this.userRepo.save(user);
    return true;
  }
}
