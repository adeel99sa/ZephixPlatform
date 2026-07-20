import {
  Injectable,
  Logger,
  Optional,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChangeRequestEntity } from '../entities/change-request.entity';
import { CreateChangeRequestDto } from '../dto/create-change-request.dto';
import { UpdateChangeRequestDto } from '../dto/update-change-request.dto';
import { TransitionChangeRequestDto } from '../dto/transition-change-request.dto';
import { ChangeRequestStatus } from '../types/change-request.enums';
import { GovernanceRuleEngineService } from '../../governance-rules/services/governance-rule-engine.service';
import { EvaluationDecision } from '../../governance-rules/entities/governance-evaluation.entity';
import { DomainEventEmitterService } from '../../kpi-queue/services/domain-event-emitter.service';
import { DOMAIN_EVENTS } from '../../kpi-queue/constants/queue.constants';
import {
  Workspace,
  WorkspaceComplexityMode,
  selfApprovalAllowedForMode,
  selfApprovalForbiddenError,
} from '../../workspaces/entities/workspace.entity';

// SOD-CONSISTENCY-1: organizationId is REQUIRED. It was optional, and the
// controller silently omitted it — so every `if (actor.organizationId)` guard
// downstream (self-approval mode check, governance rule evaluation, KPI events)
// became a no-op on the whole change-request HTTP surface. A required field is
// the structural fix: a caller that starves it can no longer compile.
export type ActorContext = {
  userId: string;
  organizationId: string;
  workspaceRole?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
  platformRole?: string;
};

@Injectable()
export class ChangeRequestsService {
  private readonly logger = new Logger(ChangeRequestsService.name);

  constructor(
    @InjectRepository(ChangeRequestEntity)
    private readonly repo: Repository<ChangeRequestEntity>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @Optional()
    private readonly governanceEngine?: GovernanceRuleEngineService,
    @Optional()
    private readonly domainEventEmitter?: DomainEventEmitterService,
  ) {}

  /**
   * SOD-PORT-1 / SOD-CONSISTENCY-1: does the workspace's complexity mode permit
   * self-approval? Returns the RESOLVED mode alongside the verdict so the caller
   * can render an honest denial (a genuine GOVERNED ban reads differently from a
   * fail-closed on an unresolvable workspace). Fails CLOSED on an unresolvable
   * workspace/mode — but never SILENTLY. `organizationId` is now required at the
   * ActorContext type; if one still reaches here empty, that is an upstream
   * caller starving the field, so we WARN loudly rather than quietly no-op:
   * governance that quietly cannot run is worse than governance that errors.
   */
  private async resolveSelfApprovalMode(
    organizationId: string,
    workspaceId: string,
  ): Promise<{ allowed: boolean; mode: WorkspaceComplexityMode | string | null }> {
    if (!organizationId) {
      this.logger.warn(
        `[SOD] self-approval check for workspace ${workspaceId} received no organizationId — failing closed. An upstream caller is not supplying org context.`,
      );
      return { allowed: false, mode: null };
    }
    const ws = await this.workspaceRepo.findOne({
      where: { id: workspaceId, organizationId },
      select: ['id', 'complexityMode'],
    });
    const mode = ws?.complexityMode ?? null;
    return { allowed: selfApprovalAllowedForMode(mode), mode };
  }

  async list(workspaceId: string, projectId: string) {
    const rows = await this.repo.find({
      where: { workspaceId, projectId },
      order: { createdAt: 'DESC' },
    });
    // DTO-GAPS-1: self-approval is authoritative on the row (approver IS the
    // creator) — only reachable in LEAN/STANDARD since GOVERNED blocks it at
    // approve-time. Surface it on the list DTO so the UI never re-derives it by
    // comparing actor ids (and never has to read event metadata to learn it).
    return rows.map((cr) => ({
      ...cr,
      selfApproved:
        cr.approvedByUserId !== null &&
        cr.approvedByUserId === cr.createdByUserId,
    }));
  }

  async get(workspaceId: string, projectId: string, id: string) {
    const row = await this.repo.findOne({
      where: { id, workspaceId, projectId },
    });
    if (!row) throw new NotFoundException('CHANGE_REQUEST_NOT_FOUND');
    return row;
  }

  async create(
    workspaceId: string,
    projectId: string,
    dto: CreateChangeRequestDto,
    actor: ActorContext,
  ) {
    const row = this.repo.create({
      workspaceId,
      projectId,
      title: dto.title,
      description: dto.description ?? null,
      reason: dto.reason ?? null,
      impactScope: dto.impactScope,
      impactCost: dto.impactCost ?? null,
      impactDays: dto.impactDays ?? null,
      status: ChangeRequestStatus.DRAFT,
      createdByUserId: actor.userId,
      approvedByUserId: null,
      approvedAt: null,
      rejectedByUserId: null,
      rejectedAt: null,
      rejectionReason: null,
      implementedByUserId: null,
      implementedAt: null,
    });
    return this.repo.save(row);
  }

  async update(
    workspaceId: string,
    projectId: string,
    id: string,
    dto: UpdateChangeRequestDto,
  ) {
    const row = await this.get(workspaceId, projectId, id);

    if (row.status !== ChangeRequestStatus.DRAFT) {
      throw new BadRequestException('CHANGE_REQUEST_NOT_EDITABLE');
    }

    if (dto.title !== undefined) row.title = dto.title;
    if (dto.description !== undefined) row.description = dto.description;
    if (dto.reason !== undefined) row.reason = dto.reason;
    if (dto.impactScope !== undefined) row.impactScope = dto.impactScope;
    if (dto.impactCost !== undefined) row.impactCost = dto.impactCost;
    if (dto.impactDays !== undefined) row.impactDays = dto.impactDays;

    return this.repo.save(row);
  }

  async submit(workspaceId: string, projectId: string, id: string) {
    const row = await this.get(workspaceId, projectId, id);

    if (row.status !== ChangeRequestStatus.DRAFT) {
      throw new BadRequestException('CHANGE_REQUEST_INVALID_TRANSITION');
    }

    row.status = ChangeRequestStatus.SUBMITTED;
    const saved = await this.repo.save(row);

    // Wave 10: Emit domain event for KPI recompute
    if (this.domainEventEmitter) {
      this.domainEventEmitter
        .emit(DOMAIN_EVENTS.CHANGE_REQUEST_STATUS_CHANGED, {
          workspaceId,
          organizationId: '',
          projectId,
          entityId: saved.id,
          entityType: 'CHANGE_REQUEST',
        })
        .catch(() => {});
    }

    return saved;
  }

  async approve(
    workspaceId: string,
    projectId: string,
    id: string,
    actor: ActorContext,
  ) {
    this.requireApprover(actor);

    const row = await this.get(workspaceId, projectId, id);
    if (row.status !== ChangeRequestStatus.SUBMITTED) {
      throw new BadRequestException('CHANGE_REQUEST_INVALID_TRANSITION');
    }

    // SOD-PORT-1: self-approval control, ordered BEFORE the governance eval and
    // the state mutation (identity check precedes role/policy). Approving your
    // OWN change request is blocked in GOVERNED workspaces (separation of
    // duties) and permitted — but recorded on the receipt — in LEAN/STANDARD.
    // The self-approval is visible on the row itself (approved_by === created_by).
    const isSelfApproval = row.createdByUserId === actor.userId;
    if (isSelfApproval) {
      const { allowed, mode } = await this.resolveSelfApprovalMode(
        actor.organizationId,
        workspaceId,
      );
      if (!allowed) {
        // Honest, mode-aware denial — a real GOVERNED ban reads differently from
        // a fail-closed on an unresolvable mode (SOD-CONSISTENCY-1).
        throw new ForbiddenException(
          selfApprovalForbiddenError(mode, 'change request'),
        );
      }
    }

    // Governance rule evaluation
    if (this.governanceEngine && actor.organizationId) {
      const govResult =
        await this.governanceEngine.evaluateChangeRequestStatusChange({
          organizationId: actor.organizationId,
          workspaceId,
          crId: row.id,
          fromStatus: row.status,
          toStatus: ChangeRequestStatus.APPROVED,
          changeRequest: row as any,
          actor: {
            userId: actor.userId,
            platformRole: actor.platformRole ?? 'MEMBER',
            workspaceRole: actor.workspaceRole,
          },
        });
      if (govResult.decision === EvaluationDecision.BLOCK) {
        throw new BadRequestException({
          code: 'GOVERNANCE_RULE_BLOCKED',
          message: 'Transition blocked by governance rules',
          evaluationId: govResult.evaluationId,
          reasons: govResult.reasons,
        });
      }
    }

    row.status = ChangeRequestStatus.APPROVED;
    row.approvedByUserId = actor.userId;
    row.approvedAt = new Date();
    row.rejectedByUserId = null;
    row.rejectedAt = null;
    row.rejectionReason = null;

    const saved = await this.repo.save(row);

    // Wave 10: Emit domain event for KPI recompute
    if (this.domainEventEmitter && actor.organizationId) {
      this.domainEventEmitter
        .emit(DOMAIN_EVENTS.CHANGE_REQUEST_STATUS_CHANGED, {
          workspaceId,
          organizationId: actor.organizationId,
          projectId,
          entityId: saved.id,
          entityType: 'CHANGE_REQUEST',
          // SOD-PORT-1: the receipt must not imply peer review that did not
          // happen. Permitted only in LEAN/STANDARD; GOVERNED throws above.
          // (Also plainly visible on the row: approved_by === created_by.)
          meta: { selfApproved: isSelfApproval },
        })
        .catch(() => {});
    }

    return saved;
  }

  async reject(
    workspaceId: string,
    projectId: string,
    id: string,
    actor: ActorContext,
    dto: TransitionChangeRequestDto,
  ) {
    this.requireApprover(actor);

    const row = await this.get(workspaceId, projectId, id);
    if (row.status !== ChangeRequestStatus.SUBMITTED) {
      throw new BadRequestException('CHANGE_REQUEST_INVALID_TRANSITION');
    }

    row.status = ChangeRequestStatus.REJECTED;
    row.rejectedByUserId = actor.userId;
    row.rejectedAt = new Date();
    row.rejectionReason = dto.reason ?? null;

    const saved = await this.repo.save(row);

    // Wave 10: Emit domain event for KPI recompute
    if (this.domainEventEmitter && actor.organizationId) {
      this.domainEventEmitter
        .emit(DOMAIN_EVENTS.CHANGE_REQUEST_STATUS_CHANGED, {
          workspaceId,
          organizationId: actor.organizationId,
          projectId,
          entityId: saved.id,
          entityType: 'CHANGE_REQUEST',
        })
        .catch(() => {});
    }

    return saved;
  }

  async implement(
    workspaceId: string,
    projectId: string,
    id: string,
    actor: ActorContext,
  ) {
    const row = await this.get(workspaceId, projectId, id);

    if (row.status !== ChangeRequestStatus.APPROVED) {
      throw new BadRequestException('CHANGE_REQUEST_INVALID_TRANSITION');
    }

    row.status = ChangeRequestStatus.IMPLEMENTED;
    row.implementedByUserId = actor.userId;
    row.implementedAt = new Date();

    const saved = await this.repo.save(row);

    // Wave 10: Emit domain event for KPI recompute
    if (this.domainEventEmitter && actor.organizationId) {
      this.domainEventEmitter
        .emit(DOMAIN_EVENTS.CHANGE_REQUEST_STATUS_CHANGED, {
          workspaceId,
          organizationId: actor.organizationId,
          projectId,
          entityId: saved.id,
          entityType: 'CHANGE_REQUEST',
        })
        .catch(() => {});
    }

    return saved;
  }

  async remove(workspaceId: string, projectId: string, id: string) {
    const row = await this.get(workspaceId, projectId, id);

    if (row.status !== ChangeRequestStatus.DRAFT) {
      throw new BadRequestException('CHANGE_REQUEST_NOT_DELETABLE');
    }

    await this.repo.delete({ id: row.id, workspaceId, projectId });
    return { deleted: true };
  }

  private requireApprover(actor: ActorContext) {
    const role = actor.workspaceRole ?? 'MEMBER';
    if (role !== 'OWNER' && role !== 'ADMIN') {
      throw new ForbiddenException('INSUFFICIENT_ROLE');
    }
  }
}
