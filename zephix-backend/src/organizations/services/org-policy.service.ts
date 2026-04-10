/**
 * OrgPolicyService — Platform P-1: Centralized org-level permission policy resolution.
 *
 * Reads Organization.settings.permissions JSONB and returns resolved policies
 * with sensible defaults. Used by workspace guards and task services to
 * enforce org-level policies as the CEILING — workspace config can restrict
 * further but cannot expand beyond org policy.
 *
 * Platform ADMIN is never blocked by org policies (they set them).
 *
 * Exported from @Global() OrganizationsModule so all modules can inject
 * without explicit imports.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../entities/organization.entity';

export interface OrgPermissionPolicies {
  wsOwnersCanManagePermissions: boolean;
  wsOwnersCanInviteMembers: boolean;
  wsOwnersCanCreateProjects: boolean;
  wsOwnersCanDeleteProjects: boolean;
  membersCanCreateTasks: boolean;
  membersCanDeleteOwnTasks: boolean;
  viewersCanComment: boolean;
}

const DEFAULT_POLICIES: OrgPermissionPolicies = {
  wsOwnersCanManagePermissions: true,
  wsOwnersCanInviteMembers: true,
  wsOwnersCanCreateProjects: true,
  wsOwnersCanDeleteProjects: false,
  membersCanCreateTasks: true,
  membersCanDeleteOwnTasks: false,
  viewersCanComment: true,
};

@Injectable()
export class OrgPolicyService {
  private readonly logger = new Logger(OrgPolicyService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  /**
   * Load org permission policies. Returns defaults merged with stored values.
   * Call once per request, pass the result to individual checks.
   */
  async getPolicies(organizationId: string): Promise<OrgPermissionPolicies> {
    try {
      const org = await this.orgRepo.findOne({
        where: { id: organizationId },
        select: ['id', 'settings'],
      });
      if (!org) return { ...DEFAULT_POLICIES };
      const stored = (org.settings as any)?.permissions || {};
      return { ...DEFAULT_POLICIES, ...stored };
    } catch (error) {
      this.logger.warn('Failed to load org policies, using defaults', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { ...DEFAULT_POLICIES };
    }
  }

  /**
   * Check a specific policy. Returns true if allowed, false if blocked.
   * Platform ADMIN always returns true (they set the policies, never blocked).
   */
  isPolicyAllowed(
    policies: OrgPermissionPolicies,
    policyKey: keyof OrgPermissionPolicies,
    platformRole?: string | null,
  ): boolean {
    if (this.isAdmin(platformRole)) return true;
    return policies[policyKey] ?? DEFAULT_POLICIES[policyKey];
  }

  private isAdmin(platformRole?: string | null): boolean {
    const normalized = (platformRole || '').toUpperCase();
    return ['ADMIN', 'OWNER', 'ADMINISTRATOR'].includes(normalized);
  }
}
