import { Controller, Get, Post, Body, Param, UseGuards, Req, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from '../entities/project.entity';
import { ProjectPhase } from '../entities/project-phase.entity';
import { IsIn, IsInt, IsISO8601, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

class CreatePhaseDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsIn(['not-started','in-progress','blocked','done']) @IsOptional() status?: string;
  @IsInt() @Min(1) @IsOptional() order?: number;
  @IsISO8601() @IsOptional() startDate?: string;
  @IsISO8601() @IsOptional() endDate?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/phases')
export class ProjectPhasesController {
  constructor(
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectPhase) private readonly phaseRepo: Repository<ProjectPhase>,
  ) {}

  @Get()
  async list(@Param('projectId') projectId: string) {
    const project = await this.projectRepo.findOne({ where: { id: projectId }});
    if (!project) throw new NotFoundException('Project not found');

    const phases = await this.phaseRepo.createQueryBuilder('p')
      .where('p.project_id = :projectId', { projectId })
      .orderBy('p.order', 'ASC')
      .getMany();

    return { success: true, data: phases };
  }

  @Post()
  async create(@Param('projectId') projectId: string, @Body() dto: CreatePhaseDto, @Req() req: any) {
    const project = await this.projectRepo.findOne({ where: { id: projectId }});
    if (!project) throw new NotFoundException('Project not found');

    const max = await this.phaseRepo.createQueryBuilder('p')
      .where('p.project_id = :projectId', { projectId })
      .select('COALESCE(MAX(p.order), 0)', 'max')
      .getRawOne<{ max: number }>();

    const entity = this.phaseRepo.create({
      projectId,
      organizationId: req.user?.organizationId ?? null,
      workspaceId: (project as any).workspaceId ?? null,
      name: dto.name,
      status: (dto.status ?? 'not-started') as 'not-started' | 'in-progress' | 'blocked' | 'done',
      order: dto.order ?? (Number(max?.max ?? 0) + 1),
      startDate: dto.startDate ?? null,
      endDate: dto.endDate ?? null,
    });

    const saved = await this.phaseRepo.save(entity);
    return { success: true, data: saved };
  }
}
