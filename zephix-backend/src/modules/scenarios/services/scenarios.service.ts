import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScenarioPlan, ScenarioScopeType, ScenarioStatus } from '../entities/scenario-plan.entity';
import { ScenarioAction, ScenarioActionType, ScenarioActionPayload } from '../entities/scenario-action.entity';
import { ScenarioResult } from '../entities/scenario-result.entity';
import { EntitlementService } from '../../billing/entitlements/entitlement.service';
import { AuditService } from '../../audit/services/audit.service';
import { AuditEntityType, AuditAction, AuditSource } from '../../audit/audit.constants';

/** Actor context for audit logging */
export interface ScenarioActorContext {
  userId: string;
  platformRole: string;
}

@Injectable()
export class ScenariosService {
  private readonly logger = new Logger(ScenariosService.name);

  constructor(
    @InjectRepository(ScenarioPlan)
    private readonly planRepo: Repository<ScenarioPlan>,
    @InjectRepository(ScenarioAction)
    private readonly actionRepo: Repository<ScenarioAction>,
    @InjectRepository(ScenarioResult)
    private readonly resultRepo: Repository<ScenarioResult>,
    private readonly entitlementService: EntitlementService,
    private readonly auditService: AuditService,
  ) {}

  // ── CRUD: Scenario Plans ─────────────────────────────────────────────

  async create(opts: {
    organizationId: string;
    workspaceId: string;
    name: string;
    description?: string;
    scopeType: ScenarioScopeType;
    scopeId: string;
    createdBy: string;
    actor?: ScenarioActorContext;
  }): Promise<ScenarioPlan> {
    // Phase 3A: Enforce scenario count quota
    const currentCount = await this.planRepo.count({
      where: { organizationId: opts.organizationId },
    });
    await this.entitlementService.assertWithinLimit(
      opts.organizationId,
      'max_scenarios',
      currentCount,
    );

    const plan = this.planRepo.create({
      organizationId: opts.organizationId,
      workspaceId: opts.workspaceId,
      name: opts.name,
      description: opts.description || null,
      scopeType: opts.scopeType,
      scopeId: opts.scopeId,
      status: 'draft',
      createdBy: opts.createdBy,
    });
    const saved = await this.planRepo.save(plan);

    // Phase 3B: Audit create
    if (opts.actor) {
      await this.auditService.record({
        organizationId: opts.organizationId,
        workspaceId: opts.workspaceId,
        actorUserId: opts.actor.userId,
        actorPlatformRole: opts.actor.platformRole,
        entityType: AuditEntityType.SCENARIO_PLAN,
        entityId: saved.id,
        action: AuditAction.CREATE,
        metadata: {
          name: saved.name,
          scopeType: saved.scopeType,
          scopeId: saved.scopeId,
          source: AuditSource.SCENARIOS,
        },
      });
    }

    return saved;
  }

  async list(organizationId: string, workspaceId: string): Promise<ScenarioPlan[]> {
    return this.planRepo.find({
      where: { organizationId, workspaceId, deletedAt: null as any },
      order: { updatedAt: 'DESC' },
    });
  }

  async getById(
    id: string,
    organizationId: string,
  ): Promise<ScenarioPlan> {
    const plan = await this.planRepo.findOne({
      where: { id, organizationId, deletedAt: null as any },
      relations: ['actions', 'result'],
    });
    if (!plan) throw new NotFoundException('Scenario not found');
    return plan;
  }

  async update(
    id: string,
    organizationId: string,
    updates: { name?: string; description?: string; status?: ScenarioStatus },
    actor?: ScenarioActorContext,
  ): Promise<ScenarioPlan> {
    const plan = await this.getById(id, organizationId);
    const before = { name: plan.name, status: plan.status };
    if (updates.name !== undefined) plan.name = updates.name;
    if (updates.description !== undefined) plan.description = updates.description;
    if (updates.status !== undefined) plan.status = updates.status;
    const saved = await this.planRepo.save(plan);

    // Phase 3B: Audit update
    if (actor) {
      await this.auditService.record({
        organizationId,
        workspaceId: plan.workspaceId,
        actorUserId: actor.userId,
        actorPlatformRole: actor.platformRole,
        entityType: AuditEntityType.SCENARIO_PLAN,
        entityId: saved.id,
        action: AuditAction.UPDATE,
        before,
        after: { name: saved.name, status: saved.status },
        metadata: { source: AuditSource.SCENARIOS },
      });
    }

    return saved;
  }

  async softDelete(
    id: string,
    organizationId: string,
    actor?: ScenarioActorContext,
  ): Promise<void> {
    const plan = await this.getById(id, organizationId);
    plan.deletedAt = new Date();
    await this.planRepo.save(plan);

    // Phase 3B: Audit delete
    if (actor) {
      await this.auditService.record({
        organizationId,
        workspaceId: plan.workspaceId,
        actorUserId: actor.userId,
        actorPlatformRole: actor.platformRole,
        entityType: AuditEntityType.SCENARIO_PLAN,
        entityId: plan.id,
        action: AuditAction.DELETE,
        metadata: {
          name: plan.name,
          source: AuditSource.SCENARIOS,
        },
      });
    }
  }

  // ── Actions ──────────────────────────────────────────────────────────

  async addAction(opts: {
    scenarioId: string;
    organizationId: string;
    actionType: ScenarioActionType;
    payload: ScenarioActionPayload;
    actor?: ScenarioActorContext;
  }): Promise<ScenarioAction> {
    // Verify scenario exists and belongs to org
    const plan = await this.getById(opts.scenarioId, opts.organizationId);

    const action = this.actionRepo.create({
      organizationId: opts.organizationId,
      scenarioId: opts.scenarioId,
      actionType: opts.actionType,
      payload: opts.payload,
    });
    const saved = await this.actionRepo.save(action);

    // Phase 3B: Audit action create
    if (opts.actor) {
      await this.auditService.record({
        organizationId: opts.organizationId,
        workspaceId: plan.workspaceId,
        actorUserId: opts.actor.userId,
        actorPlatformRole: opts.actor.platformRole,
        entityType: AuditEntityType.SCENARIO_ACTION,
        entityId: saved.id,
        action: AuditAction.CREATE,
        metadata: {
          scenarioId: opts.scenarioId,
          actionType: opts.actionType,
          source: AuditSource.SCENARIOS,
        },
      });
    }

    return saved;
  }

  async removeAction(
    actionId: string,
    scenarioId: string,
    organizationId: string,
    actor?: ScenarioActorContext,
  ): Promise<void> {
    const action = await this.actionRepo.findOne({
      where: { id: actionId, scenarioId, organizationId },
    });
    if (!action) throw new NotFoundException('Action not found');
    await this.actionRepo.remove(action);

    // Phase 3B: Audit action delete
    if (actor) {
      await this.auditService.record({
        organizationId,
        actorUserId: actor.userId,
        actorPlatformRole: actor.platformRole,
        entityType: AuditEntityType.SCENARIO_ACTION,
        entityId: actionId,
        action: AuditAction.DELETE,
        metadata: {
          scenarioId,
          actionType: action.actionType,
          source: AuditSource.SCENARIOS,
        },
      });
    }
  }

  async getActions(scenarioId: string, organizationId: string): Promise<ScenarioAction[]> {
    return this.actionRepo.find({
      where: { scenarioId, organizationId },
      order: { createdAt: 'ASC' },
    });
  }

  // ── Results ──────────────────────────────────────────────────────────

  async upsertResult(
    scenarioId: string,
    organizationId: string,
    summary: any,
    warnings: string[],
    actor?: ScenarioActorContext,
  ): Promise<ScenarioResult> {
    let result = await this.resultRepo.findOne({
      where: { scenarioId, organizationId },
    });

    if (result) {
      result.summary = summary;
      result.warnings = warnings;
      result.computedAt = new Date();
      const saved = await this.resultRepo.save(result);

      // Phase 3B: Audit compute
      if (actor) {
        await this.auditService.record({
          organizationId,
          actorUserId: actor.userId,
          actorPlatformRole: actor.platformRole,
          entityType: AuditEntityType.SCENARIO_RESULT,
          entityId: saved.id,
          action: AuditAction.COMPUTE,
          metadata: {
            scenarioId,
            warningsCount: warnings.length,
            source: AuditSource.SCENARIOS,
          },
        });
      }

      return saved;
    }

    result = this.resultRepo.create({
      organizationId,
      scenarioId,
      summary,
      warnings,
      computedAt: new Date(),
    });
    const saved = await this.resultRepo.save(result);

    // Phase 3B: Audit compute
    if (actor) {
      await this.auditService.record({
        organizationId,
        actorUserId: actor.userId,
        actorPlatformRole: actor.platformRole,
        entityType: AuditEntityType.SCENARIO_RESULT,
        entityId: saved.id,
        action: AuditAction.COMPUTE,
        metadata: {
          scenarioId,
          warningsCount: warnings.length,
          source: AuditSource.SCENARIOS,
        },
      });
    }

    return saved;
  }
}
