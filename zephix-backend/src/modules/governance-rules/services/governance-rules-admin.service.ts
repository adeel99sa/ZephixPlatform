import {
  Injectable,
  Optional,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { GovernanceRuleSet, ScopeType } from '../entities/governance-rule-set.entity';
import { GovernanceRule, RuleDefinition } from '../entities/governance-rule.entity';
import { GovernanceRuleActiveVersion } from '../entities/governance-rule-active-version.entity';
import { GovernanceEvaluation } from '../entities/governance-evaluation.entity';
import { GovernanceRuleResolverService } from './governance-rule-resolver.service';
import { DomainEventEmitterService } from '../../kpi-queue/services/domain-event-emitter.service';
import { DOMAIN_EVENTS } from '../../kpi-queue/constants/queue.constants';

@Injectable()
export class GovernanceRulesAdminService {
  private readonly logger = new Logger(GovernanceRulesAdminService.name);

  constructor(
    @InjectRepository(GovernanceRuleSet)
    private readonly ruleSetRepo: Repository<GovernanceRuleSet>,
    @InjectRepository(GovernanceRule)
    private readonly ruleRepo: Repository<GovernanceRule>,
    @InjectRepository(GovernanceRuleActiveVersion)
    private readonly activeVersionRepo: Repository<GovernanceRuleActiveVersion>,
    @InjectRepository(GovernanceEvaluation)
    private readonly evaluationRepo: Repository<GovernanceEvaluation>,
    private readonly resolverService: GovernanceRuleResolverService,
    @Optional()
    private readonly domainEventEmitter?: DomainEventEmitterService,
  ) {}

  // --- Rule Set CRUD ---

  async createRuleSet(data: Partial<GovernanceRuleSet>): Promise<GovernanceRuleSet> {
    const ruleSet = this.ruleSetRepo.create(data);
    return this.ruleSetRepo.save(ruleSet);
  }

  async listRuleSets(filters: {
    organizationId?: string;
    workspaceId?: string;
    entityType?: string;
    isActive?: boolean;
  }): Promise<GovernanceRuleSet[]> {
    const qb = this.ruleSetRepo.createQueryBuilder('rs');

    if (filters.organizationId) {
      qb.andWhere(
        '(rs.organization_id = :orgId OR rs.organization_id IS NULL)',
        { orgId: filters.organizationId },
      );
    }
    if (filters.workspaceId) {
      qb.andWhere(
        '(rs.workspace_id = :wsId OR rs.workspace_id IS NULL)',
        { wsId: filters.workspaceId },
      );
    }
    if (filters.entityType) {
      qb.andWhere('rs.entity_type = :et', { et: filters.entityType });
    }
    if (filters.isActive !== undefined) {
      qb.andWhere('rs.is_active = :active', { active: filters.isActive });
    }

    return qb.orderBy('rs.created_at', 'ASC').getMany();
  }

  // AdminGuard proves ADMIN role, not row ownership. An id-keyed rule set must
  // be scoped to the caller's org, or an admin in org A can read/mutate org B's
  // governance rules. Cross-org / unknown → 404, indistinguishable.
  async getRuleSet(
    id: string,
    organizationId: string,
  ): Promise<GovernanceRuleSet> {
    const rs = await this.ruleSetRepo.findOne({
      where: { id, organizationId },
    });
    if (!rs) throw new NotFoundException('Rule set not found');
    return rs;
  }

  async updateRuleSet(
    id: string,
    data: Partial<GovernanceRuleSet>,
    organizationId: string,
  ): Promise<GovernanceRuleSet> {
    const rs = await this.getRuleSet(id, organizationId);
    Object.assign(rs, data);
    const saved = await this.ruleSetRepo.save(rs);
    this.resolverService.invalidateCache();

    // Wave 10: Emit governance change event for KPI rollup triggers.
    // scopeId may reference a portfolio or program; emit the corresponding event.
    if (this.domainEventEmitter && saved.workspaceId && saved.scopeId) {
      const eventName =
        saved.scopeType === ScopeType.WORKSPACE || saved.scopeType === ScopeType.ORG
          ? DOMAIN_EVENTS.PORTFOLIO_GOVERNANCE_CHANGED
          : undefined;

      if (eventName) {
        this.domainEventEmitter
          .emit(eventName, {
            workspaceId: saved.workspaceId,
            organizationId: saved.organizationId ?? '',
            projectId: '',
            portfolioId: saved.scopeId,
          })
          .catch((err) =>
            this.logger.warn(`Domain governance event emit failed: ${err}`),
          );
      }
    }

    return saved;
  }

  async deactivateRuleSet(
    id: string,
    organizationId: string,
  ): Promise<GovernanceRuleSet> {
    return this.updateRuleSet(id, { isActive: false }, organizationId);
  }

  // --- Rule Version Management ---

  async addRuleVersion(
    params: {
      ruleSetId: string;
      code: string;
      ruleDefinition: RuleDefinition;
      createdBy?: string;
      setActive?: boolean;
    },
    organizationId: string,
  ): Promise<GovernanceRule> {
    // Verify the parent rule set belongs to the caller's org before writing.
    const ruleSet = await this.getRuleSet(params.ruleSetId, organizationId);

    // Find latest version for this code
    const latestRule = await this.ruleRepo.findOne({
      where: { ruleSetId: params.ruleSetId, code: params.code },
      order: { version: 'DESC' },
    });

    const newVersion = latestRule ? latestRule.version + 1 : 1;

    const rule = this.ruleRepo.create({
      ruleSetId: params.ruleSetId,
      code: params.code,
      version: newVersion,
      isActive: true,
      ruleDefinition: params.ruleDefinition,
      createdBy: params.createdBy ?? null,
    });

    const saved = await this.ruleRepo.save(rule);

    // Set as active version if requested or if first version
    if (params.setActive !== false) {
      await this.setActiveVersion(
        params.ruleSetId,
        params.code,
        saved.id,
        organizationId,
      );
    }

    return saved;
  }

  async setActiveVersion(
    ruleSetId: string,
    code: string,
    ruleId: string,
    organizationId: string,
  ): Promise<GovernanceRuleActiveVersion> {
    // Verify the parent rule set belongs to the caller's org before writing.
    await this.getRuleSet(ruleSetId, organizationId);

    // Verify the rule belongs to the rule set
    const rule = await this.ruleRepo.findOne({
      where: { id: ruleId, ruleSetId, code },
    });
    if (!rule) {
      throw new BadRequestException(
        `Rule ${ruleId} not found for set ${ruleSetId} with code ${code}`,
      );
    }

    // Upsert active version
    const existing = await this.activeVersionRepo.findOne({
      where: { ruleSetId, code },
    });

    if (existing) {
      existing.activeRuleId = ruleId;
      const saved = await this.activeVersionRepo.save(existing);
      this.resolverService.invalidateCache();
      return saved;
    }

    const av = this.activeVersionRepo.create({
      ruleSetId,
      code,
      activeRuleId: ruleId,
    });
    const saved = await this.activeVersionRepo.save(av);
    this.resolverService.invalidateCache();
    return saved;
  }

  async listRules(
    ruleSetId: string,
    organizationId: string,
  ): Promise<GovernanceRule[]> {
    // SEC-XORG-READ-1 (R1): confirm the rule set belongs to the caller's org
    // before listing its rules. getRuleSet is org-scoped and throws NotFound
    // for a cross-org or unknown id — indistinguishable to the caller.
    await this.getRuleSet(ruleSetId, organizationId);
    return this.ruleRepo.find({
      where: { ruleSetId },
      order: { code: 'ASC', version: 'DESC' },
    });
  }

  async listActiveRules(
    ruleSetId: string,
    organizationId: string,
  ): Promise<GovernanceRuleActiveVersion[]> {
    // SEC-XORG-READ-1 (R1): org-gate via the rule set before listing.
    await this.getRuleSet(ruleSetId, organizationId);
    return this.activeVersionRepo.find({
      where: { ruleSetId },
      relations: ['activeRule'],
      order: { code: 'ASC' },
    });
  }

  // --- Evaluations ---

  async listEvaluations(params: {
    organizationId: string;
    workspaceId: string;
    entityType?: string;
    entityId?: string;
    decision?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: GovernanceEvaluation[]; total: number }> {
    // SEC-XORG-READ-1 (R1): the organizationId + workspaceId in this where
    // clause are the tenant boundary, so a foreign workspaceId cannot surface
    // another org's governance decisions. findAndCount is used (not
    // createQueryBuilder) only because the dev/test tenant guardrail exempts
    // the find family — the org predicate is what scopes the query.
    const where: FindOptionsWhere<GovernanceEvaluation> = {
      organizationId: params.organizationId,
      workspaceId: params.workspaceId,
    };
    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;
    if (params.decision) {
      where.decision = params.decision as GovernanceEvaluation['decision'];
    }

    const [data, total] = await this.evaluationRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: params.limit ?? 50,
      skip: params.offset ?? 0,
    });
    return { data, total };
  }
}
