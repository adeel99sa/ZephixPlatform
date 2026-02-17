import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GovernanceRuleSet, GovernanceEntityType, ScopeType } from '../entities/governance-rule-set.entity';
import { GovernanceRule, RuleDefinition } from '../entities/governance-rule.entity';
import { GovernanceRuleActiveVersion } from '../entities/governance-rule-active-version.entity';

export interface ResolvedRule {
  ruleSetId: string;
  ruleSetName: string;
  enforcementMode: string;
  scopeType: ScopeType;
  ruleId: string;
  code: string;
  version: number;
  ruleDefinition: RuleDefinition;
}

export interface ResolvedRuleSet {
  entityType: GovernanceEntityType;
  rules: ResolvedRule[];
}

interface CacheEntry {
  result: ResolvedRuleSet;
  expiresAt: number;
}

/** Default TTL for resolved rules cache: 60 seconds */
const CACHE_TTL_MS = 60_000;

/**
 * Resolves applicable governance rules using hierarchical precedence:
 * PROJECT > TEMPLATE > WORKSPACE > ORG > SYSTEM
 *
 * Rules are merged by code — higher-precedence scope wins per code.
 * Within the same scope level, all rules are included.
 * Result is sorted deterministically by code.
 *
 * Includes a 60s in-memory TTL cache keyed by resolve params to remove
 * 3 DB reads from clustered hot-path transitions on the same project.
 */
@Injectable()
export class GovernanceRuleResolverService {
  private readonly logger = new Logger(GovernanceRuleResolverService.name);

  private static readonly SCOPE_PRECEDENCE: ScopeType[] = [
    ScopeType.PROJECT,
    ScopeType.TEMPLATE,
    ScopeType.WORKSPACE,
    ScopeType.ORG,
    ScopeType.SYSTEM,
  ];

  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @InjectRepository(GovernanceRuleSet)
    private readonly ruleSetRepo: Repository<GovernanceRuleSet>,
    @InjectRepository(GovernanceRuleActiveVersion)
    private readonly activeVersionRepo: Repository<GovernanceRuleActiveVersion>,
    @InjectRepository(GovernanceRule)
    private readonly ruleRepo: Repository<GovernanceRule>,
  ) {}

  /**
   * Invalidate all cached entries. Called when admin mutates active versions.
   */
  bustCache(): void {
    this.cache.clear();
  }

  /** Alias for bustCache — used by admin service. */
  invalidateCache(): void {
    this.bustCache();
  }

  async resolve(params: {
    organizationId: string;
    workspaceId: string;
    projectId?: string;
    templateId?: string;
    entityType: GovernanceEntityType;
  }): Promise<ResolvedRuleSet> {
    const { organizationId, workspaceId, projectId, templateId, entityType } =
      params;

    // Check cache
    const cacheKey = this.buildCacheKey(params);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    const result = await this.resolveFromDb(
      organizationId,
      workspaceId,
      projectId,
      templateId,
      entityType,
    );

    // Store in cache
    this.cache.set(cacheKey, {
      result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    // Lazy evict stale entries (keep map small)
    if (this.cache.size > 500) {
      this.evictStale();
    }

    return result;
  }

  private async resolveFromDb(
    organizationId: string,
    workspaceId: string,
    projectId: string | undefined,
    templateId: string | undefined,
    entityType: GovernanceEntityType,
  ): Promise<ResolvedRuleSet> {
    // Query 1: Load all active rule sets for this entity type that could apply
    const qb = this.ruleSetRepo
      .createQueryBuilder('rs')
      .where('rs.entity_type = :entityType', { entityType })
      .andWhere('rs.is_active = true');

    const scopeConditions: string[] = [];
    const scopeParams: Record<string, any> = {};

    scopeConditions.push("(rs.scope_type = 'SYSTEM')");

    scopeConditions.push(
      "(rs.scope_type = 'ORG' AND rs.organization_id = :orgId)",
    );
    scopeParams.orgId = organizationId;

    scopeConditions.push(
      "(rs.scope_type = 'WORKSPACE' AND rs.workspace_id = :wsId)",
    );
    scopeParams.wsId = workspaceId;

    if (projectId) {
      scopeConditions.push(
        "(rs.scope_type = 'PROJECT' AND rs.scope_id = :projId)",
      );
      scopeParams.projId = projectId;
    }

    if (templateId) {
      scopeConditions.push(
        "(rs.scope_type = 'TEMPLATE' AND rs.scope_id = :tplId)",
      );
      scopeParams.tplId = templateId;
    }

    qb.andWhere(`(${scopeConditions.join(' OR ')})`, scopeParams);

    const ruleSets = await qb.getMany();

    // Short-circuit: no rule sets = no further queries
    if (ruleSets.length === 0) {
      return { entityType, rules: [] };
    }

    // Query 2: Load active versions for all matched rule sets (batched IN)
    const ruleSetIds = ruleSets.map((rs) => rs.id);
    const activeVersions = await this.activeVersionRepo
      .createQueryBuilder('av')
      .where('av.rule_set_id IN (:...ids)', { ids: ruleSetIds })
      .getMany();

    // Short-circuit: no active versions = no rules to evaluate
    if (activeVersions.length === 0) {
      return { entityType, rules: [] };
    }

    // Query 3: Load the actual rules (batched IN)
    const activeRuleIds = activeVersions.map((av) => av.activeRuleId);
    const rules = await this.ruleRepo
      .createQueryBuilder('r')
      .where('r.id IN (:...ids)', { ids: activeRuleIds })
      .getMany();

    // Build lookup maps
    const ruleSetMap = new Map(ruleSets.map((rs) => [rs.id, rs]));
    const ruleMap = new Map(rules.map((r) => [r.id, r]));

    // Merge by code with scope precedence
    const codeToResolved = new Map<string, ResolvedRule>();

    for (const av of activeVersions) {
      const ruleSet = ruleSetMap.get(av.ruleSetId);
      const rule = ruleMap.get(av.activeRuleId);
      if (!ruleSet || !rule) continue;

      const existingEntry = codeToResolved.get(av.code);
      if (existingEntry) {
        const existingPrecedence =
          GovernanceRuleResolverService.SCOPE_PRECEDENCE.indexOf(
            existingEntry.scopeType,
          );
        const newPrecedence =
          GovernanceRuleResolverService.SCOPE_PRECEDENCE.indexOf(
            ruleSet.scopeType,
          );
        if (newPrecedence >= existingPrecedence) continue;
      }

      codeToResolved.set(av.code, {
        ruleSetId: ruleSet.id,
        ruleSetName: ruleSet.name,
        enforcementMode: ruleSet.enforcementMode,
        scopeType: ruleSet.scopeType,
        ruleId: rule.id,
        code: rule.code,
        version: rule.version,
        ruleDefinition: rule.ruleDefinition,
      });
    }

    // Sort deterministically by code
    const resolvedRules = Array.from(codeToResolved.values()).sort((a, b) =>
      a.code.localeCompare(b.code),
    );

    return { entityType, rules: resolvedRules };
  }

  private buildCacheKey(params: {
    organizationId: string;
    workspaceId: string;
    projectId?: string;
    templateId?: string;
    entityType: GovernanceEntityType;
  }): string {
    return `${params.organizationId}|${params.workspaceId}|${params.entityType}|${params.projectId ?? ''}|${params.templateId ?? ''}`;
  }

  private evictStale(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }
}
