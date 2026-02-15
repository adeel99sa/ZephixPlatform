import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsOptional, IsString } from 'class-validator';
import { ProjectBudgetEntity } from '../entities/project-budget.entity';

export type BudgetActorContext = {
  userId: string;
  workspaceRole?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
};

export class UpdateProjectBudgetDto {
  @IsOptional()
  @IsString()
  baselineBudget?: string;

  @IsOptional()
  @IsString()
  revisedBudget?: string;

  @IsOptional()
  @IsString()
  contingency?: string;

  @IsOptional()
  @IsString()
  approvedChangeBudget?: string;

  @IsOptional()
  @IsString()
  forecastAtCompletion?: string;
}

@Injectable()
export class ProjectBudgetsService {
  constructor(
    @InjectRepository(ProjectBudgetEntity)
    private readonly repo: Repository<ProjectBudgetEntity>,
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

    return this.repo.save(row);
  }

  private requireBudgetEditor(actor: BudgetActorContext) {
    const role = actor.workspaceRole ?? 'MEMBER';
    if (role !== 'OWNER' && role !== 'ADMIN') {
      throw new ForbiddenException('INSUFFICIENT_ROLE');
    }
  }
}
