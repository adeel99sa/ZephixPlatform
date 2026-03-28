import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';
import { PlanCode } from './plan-code.enum';
import {
  PLAN_ENTITLEMENTS,
  EntitlementKey,
  EntitlementDefinition,
  isBooleanFeature,
} from './entitlement.registry';

/**
 * Phase 3A: Central entitlement resolution service.
 *
 * Resolves organization → planCode → entitlements.
 * No in-memory cache (singleton scope means cache would go stale on plan changes).
 * DB query is lightweight: single row, 4 columns, indexed by PK.
 * Roadmap: Add short-TTL cache or request-scoped cache in Phase 3+.
 */
@Injectable()
export class EntitlementService {
  private readonly logger = new Logger(EntitlementService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  /**
   * Resolve the full entitlement set for an organization.
   * Always reads from DB to ensure plan changes take effect immediately.
   */
  async resolve(organizationId: string): Promise<EntitlementDefinition> {
    const org = await this.orgRepo.findOne({
      where: { id: organizationId },
      select: ['id', 'planCode', 'planStatus', 'planMetadata'],
    });

    if (!org) {
      this.logger.warn({ context: 'ENTITLEMENT_RESOLVE', organizationId, result: 'ORG_NOT_FOUND' });
      // Safe default: free plan
      return PLAN_ENTITLEMENTS[PlanCode.FREE];
    }

    const planCode = this.normalizePlanCode(org.planCode);
    let entitlements = { ...PLAN_ENTITLEMENTS[planCode] };

    // Custom plan: merge overrides from plan_metadata
    if (planCode === PlanCode.CUSTOM && org.planMetadata) {
      entitlements = this.applyOverrides(entitlements, org.planMetadata);
    }

    return entitlements;
  }

  /**
   * Check if a boolean feature is enabled for the organization.
   */
  async hasFeature(organizationId: string, key: EntitlementKey): Promise<boolean> {
    if (!isBooleanFeature(key)) return false;
    const ent = await this.resolve(organizationId);
    return ent[key] as boolean;
  }

  /**
   * Get a numeric limit for the organization. null means unlimited.
   */
  async getLimit(organizationId: string, key: EntitlementKey): Promise<number | null> {
    const ent = await this.resolve(organizationId);
    const value = ent[key];
    if (typeof value === 'number') return value;
    if (value === null) return null;
    return null;
  }

  /**
   * Assert a boolean feature is enabled. Throws 403 if not.
   */
  async assertFeature(organizationId: string, key: EntitlementKey): Promise<void> {
    const allowed = await this.hasFeature(organizationId, key);
    if (!allowed) {
      this.logger.warn({ context: 'ENTITLEMENT_DENIED', organizationId, key });
      throw new ForbiddenException({
        code: 'ENTITLEMENT_REQUIRED',
        message: `Feature '${key}' is not available on your current plan. Please upgrade.`,
        entitlement: key,
      });
    }
  }

  /**
   * Assert a numeric resource is within its plan limit.
   * currentValue = the count BEFORE the new item is created.
   * Throws 403 if limit would be exceeded.
   */
  async assertWithinLimit(
    organizationId: string,
    key: EntitlementKey,
    currentValue: number,
  ): Promise<void> {
    const limit = await this.getLimit(organizationId, key);
    if (limit === null) return; // unlimited
    if (currentValue >= limit) {
      this.logger.warn({
        context: 'QUOTA_EXCEEDED',
        organizationId,
        key,
        currentValue,
        limit,
      });
      throw new ForbiddenException({
        code: `${key.toUpperCase()}_LIMIT_EXCEEDED`,
        message: `You have reached the maximum of ${limit} for '${key}' on your current plan.`,
        limit,
        current: currentValue,
        entitlement: key,
      });
    }
  }

  /**
   * Get the plan code for an organization. Returns FREE if not found.
   */
  async getPlanCode(organizationId: string): Promise<PlanCode> {
    const org = await this.orgRepo.findOne({
      where: { id: organizationId },
      select: ['id', 'planCode'],
    });
    return this.normalizePlanCode(org?.planCode);
  }

  /**
   * Get the plan status for an organization.
   */
  async getPlanStatus(organizationId: string): Promise<string> {
    const org = await this.orgRepo.findOne({
      where: { id: organizationId },
      select: ['id', 'planStatus'],
    });
    return org?.planStatus ?? 'active';
  }

  // ── Internal helpers ──────────────────────────────────────────────

  private normalizePlanCode(raw?: string): PlanCode {
    if (!raw) return PlanCode.FREE;
    const normalized = raw.toLowerCase();
    if (Object.values(PlanCode).includes(normalized as PlanCode)) {
      return normalized as PlanCode;
    }
    return PlanCode.FREE;
  }

  private applyOverrides(
    base: EntitlementDefinition,
    metadata: Record<string, any>,
  ): EntitlementDefinition {
    const result = { ...base };
    for (const key of Object.keys(metadata)) {
      if (key in result) {
        (result as any)[key] = metadata[key];
      }
    }
    return result;
  }
}
