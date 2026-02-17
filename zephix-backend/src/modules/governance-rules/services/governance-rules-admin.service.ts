import {
  Injectable,
  Optional,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async getRuleSet(id: string): Promise<GovernanceRuleSet> {
    const rs = await this.ruleSetRepo.findOne({ where: { id } });
    if (!rs) throw new NotFoundException('Rule set not found');
    return rs;
  }

  async updateRuleSet(
    id: string,
    data: Partial<GovernanceRuleSet>,
  ): Promise<GovernanceRuleSet> {
    const rs = await this.getRuleSet(id);
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

  async deactivateRuleSet(id: string): Promise<GovernanceRuleSet> {
    return this.updateRuleSet(id, { isActive: false });
  }

  // --- Rule Version Management ---

  async addRuleVersion(params: {
    ruleSetId: string;
    code: string;
    ruleDefinition: RuleDefinition;
    createdBy?: string;
    setActive?: boolean;
  }): Promise<GovernanceRule> {
    const ruleSet = await this.getRuleSet(params.ruleSetId);

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
      await this.setActiveVersion(params.ruleSetId, params.code, saved.id);
    }

    return saved;
  }

  async setActiveVersion(
    ruleSetId: string,
    code: string,
    ruleId: string,
  ): Promise<GovernanceRuleActiveVersion> {
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

  async listRules(ruleSetId: string): Promise<GovernanceRule[]> {
    return this.ruleRepo.find({
      where: { ruleSetId },
      order: { code: 'ASC', version: 'DESC' },
    });
  }

  async listActiveRules(
    ruleSetId: string,
  ): Promise<GovernanceRuleActiveVersion[]> {
    return this.activeVersionRepo.find({
      where: { ruleSetId },
      relations: ['activeRule'],
      order: { code: 'ASC' },
    });
  }

  // --- Evaluations ---

  async listEvaluations(params: {
    workspaceId: string;
    entityType?: string;
    entityId?: string;
    decision?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: GovernanceEvaluation[]; total: number }> {
    const qb = this.evaluationRepo
      .createQueryBuilder('e')
      .where('e.workspace_id = :wsId', { wsId: params.workspaceId });

    if (params.entityType) {
      qb.andWhere('e.entity_type = :et', { et: params.entityType });
    }
    if (params.entityId) {
      qb.andWhere('e.entity_id = :eid', { eid: params.entityId });
    }
    if (params.decision) {
      qb.andWhere('e.decision = :d', { d: params.decision });
    }

    qb.orderBy('e.created_at', 'DESC');
    qb.take(params.limit ?? 50);
    qb.skip(params.offset ?? 0);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }
}
