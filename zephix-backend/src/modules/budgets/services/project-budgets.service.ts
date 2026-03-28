import {
  Injectable,
  Optional,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsOptional, Matches } from 'class-validator';
import { ProjectBudgetEntity } from '../entities/project-budget.entity';
import { DomainEventEmitterService } from '../../kpi-queue/services/domain-event-emitter.service';
import { DOMAIN_EVENTS } from '../../kpi-queue/constants/queue.constants';

export type BudgetActorContext = {
  userId: string;
  workspaceRole?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
};

const DECIMAL_MSG = 'Must be a decimal number (e.g. "250000.00")';
const DECIMAL_RE = /^\d+(\.\d{1,2})?$/;

export class UpdateProjectBudgetDto {
  @IsOptional()
  @Matches(DECIMAL_RE, { message: DECIMAL_MSG })
  baselineBudget?: string;

  @IsOptional()
  @Matches(DECIMAL_RE, { message: DECIMAL_MSG })
  revisedBudget?: string;

  @IsOptional()
  @Matches(DECIMAL_RE, { message: DECIMAL_MSG })
  contingency?: string;

  @IsOptional()
  @Matches(DECIMAL_RE, { message: DECIMAL_MSG })
  approvedChangeBudget?: string;

  @IsOptional()
  @Matches(DECIMAL_RE, { message: DECIMAL_MSG })
  forecastAtCompletion?: string;
}

@Injectable()
export class ProjectBudgetsService {
  private readonly logger = new Logger(ProjectBudgetsService.name);

  constructor(
    @InjectRepository(ProjectBudgetEntity)
    private readonly repo: Repository<ProjectBudgetEntity>,
    @Optional()
    private readonly domainEventEmitter?: DomainEventEmitterService,
  ) {}

  async get(workspaceId: string, projectId: string) {
    let row = await this.repo.findOne({
      where: { workspaceId, projectId },
    });

    // Auto-create budget record if it doesn't exist (upsert-on-read)
    if (!row) {
      row = this.repo.create({
        workspaceId,
        projectId,
        baselineBudget: '0',
        revisedBudget: '0',
        contingency: '0',
        approvedChangeBudget: '0',
        forecastAtCompletion: '0',
      });
      row = await this.repo.save(row);
    }

    return row;
  }

  async update(
    workspaceId: string,
    projectId: string,
    dto: UpdateProjectBudgetDto,
    actor: BudgetActorContext,
  ) {
    this.requireBudgetEditor(actor);

    const row = await this.get(workspaceId, projectId);

    if (dto.baselineBudget !== undefined) row.baselineBudget = dto.baselineBudget;
    if (dto.revisedBudget !== undefined) row.revisedBudget = dto.revisedBudget;
    if (dto.contingency !== undefined) row.contingency = dto.contingency;
    if (dto.approvedChangeBudget !== undefined)
      row.approvedChangeBudget = dto.approvedChangeBudget;
    if (dto.forecastAtCompletion !== undefined)
      row.forecastAtCompletion = dto.forecastAtCompletion;

    const saved = await this.repo.save(row);

    // Wave 10: Emit domain event for KPI recompute
    if (this.domainEventEmitter) {
      this.domainEventEmitter
        .emit(DOMAIN_EVENTS.BUDGET_UPDATED, {
          workspaceId,
          organizationId: '', // Budget service doesn't have org context
          projectId,
          entityId: saved.id,
          entityType: 'BUDGET',
        })
        .catch(() => {});
    }

    return saved;
  }

  private requireBudgetEditor(actor: BudgetActorContext) {
    const role = actor.workspaceRole ?? 'MEMBER';
    if (role !== 'OWNER' && role !== 'ADMIN') {
      throw new ForbiddenException('INSUFFICIENT_ROLE');
    }
  }
}
