import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ProjectPhase } from './project-phase.entity';
import { CreatePhaseDto } from './dto/create-phase.dto';
import { Project } from '../modules/projects/entities/project.entity';

@Injectable()
export class ProjectPhasesService {
  constructor(
    @InjectRepository(ProjectPhase)
    private readonly phasesRepo: Repository<ProjectPhase>,
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
  ) {}

  async listByProject(projectId: string) {
    const project = await this.projectsRepo.findOne({ where: { id: projectId as unknown as FindOptionsWhere<Project> } as any });
    if (!project) throw new NotFoundException('Project not found');

    return this.phasesRepo.find({
      where: { projectId: projectId },
      order: { order: 'ASC' },
    });
  }

  async create(projectId: string, dto: CreatePhaseDto) {
    const project = await this.projectsRepo.findOne({ where: { id: projectId as any } });
    if (!project) throw new NotFoundException('Project not found');

    const phase = this.phasesRepo.create({
      projectId: projectId,
      organizationId: (project as any).organizationId,
      workspaceId: dto.workspaceId ?? (project as any).workspaceId ?? null,
      name: dto.name,
      status: dto.status as any,
      order: dto.order,
      startDate: dto.startDate ?? null,
      endDate: dto.endDate ?? null,
      ownerUserId: dto.ownerUserId ?? null,
    });

    return this.phasesRepo.save(phase);
  }
}
