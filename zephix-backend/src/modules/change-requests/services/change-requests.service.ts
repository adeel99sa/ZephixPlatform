import {
  Injectable,
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
  selfApprovalAllowedForMode,
} from '../../workspaces/entities/workspace.entity';

export type ActorContext = {
  userId: string;
  organizationId?: string;
  workspaceRole?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
  platformRole?: string;
};

@Injectable()
export class ChangeRequestsService {
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
   * SOD-PORT-1: does the workspace's complexity mode permit self-approval?
   * Fails CLOSED (blocked) on an unresolvable workspace/mode.
   */
  private async isSelfApprovalAllowed(
    organizationId: string | undefined,
    workspaceId: string,
  ): Promise<boolean> {
    if (!organizationId) return false;
    const ws = await this.workspaceRepo.findOne({
      where: { id: workspaceId, organizationId },
      select: ['id', 'complexityMode'],
    });
    return selfApprovalAllowedForMode(ws?.complexityMode);
  }

  async list(workspaceId: string, projectId: string) {
    return this.repo.find({
      where: { workspaceId, projectId },
      order: { createdAt: 'DESC' },
    });
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
      const allowed = await this.isSelfApprovalAllowed(
        actor.organizationId,
        workspaceId,
      );
      if (!allowed) {
        throw new ForbiddenException({
          code: 'SELF_APPROVAL_FORBIDDEN',
          message:
            'You cannot approve your own change request in a governed workspace. A separate approver is required (separation of duties).',
        });
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
