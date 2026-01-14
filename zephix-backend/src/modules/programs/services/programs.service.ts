import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Between,
} from 'typeorm';
import { Program } from '../entities/program.entity';
import { Project } from '../../projects/entities/project.entity';
import { ResourceAllocation } from '../../resources/entities/resource-allocation.entity';
import { ResourceConflict } from '../../resources/entities/resource-conflict.entity';
import { Resource } from '../../resources/entities/resource.entity';
import { AllocationType } from '../../resources/enums/allocation-type.enum';
import { CapacityMathHelper } from '../../resources/helpers/capacity-math.helper';
import { ProgramStatus } from '../entities/program.entity';
import { CreateProgramDto } from '../dto/create-program.dto';
import { UpdateProgramDto } from '../dto/update-program.dto';
import { AssignProgramToProjectDto } from '../dto/assign-program-to-project.dto';
import { TenantContextService } from '../../tenancy/tenant-context.service';

@Injectable()
export class ProgramsService {
  private readonly logger = new Logger(ProgramsService.name);

  constructor(
    @InjectRepository(Program)
    private readonly programRepository: Repository<Program>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ResourceAllocation)
    private readonly allocationRepository: Repository<ResourceAllocation>,
    @InjectRepository(ResourceConflict)
    private readonly conflictRepository: Repository<ResourceConflict>,
    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
    private readonly tenantContext: TenantContextService,
  ) {}

  // PHASE 6: Workspace-scoped create
  async create(
    createDto: CreateProgramDto,
    organizationId: string,
    workspaceId: string,
    userId: string,
  ): Promise<Program> {
    const program = this.programRepository.create({
      ...createDto,
      organizationId,
      workspaceId,
      createdById: userId,
      status: createDto.status || ProgramStatus.ACTIVE,
    });

    return await this.programRepository.save(program);
  }

  // PHASE 6: Workspace-scoped list all programs in workspace
  async listByWorkspace(
    organizationId: string,
    workspaceId: string,
  ): Promise<Program[]> {
    return await this.programRepository.find({
      where: { organizationId, workspaceId },
      relations: ['portfolio'],
      order: { createdAt: 'DESC' },
    });
  }

  // PHASE 6: Workspace-scoped list by portfolio
  async listByPortfolio(
    organizationId: string,
    workspaceId: string,
    portfolioId: string,
  ): Promise<Program[]> {
    return await this.programRepository.find({
      where: { organizationId, workspaceId, portfolioId },
      order: { createdAt: 'DESC' },
    });
  }

  // PHASE 6: Workspace-scoped getById
  async getById(
    id: string,
    organizationId: string,
    workspaceId: string,
  ): Promise<Program | null> {
    const program = await this.programRepository.findOne({
      where: { id, organizationId, workspaceId },
      relations: ['portfolio', 'projects'],
    });

    return program || null;
  }

  // PHASE 6: Workspace-scoped update
  async update(
    id: string,
    updateDto: UpdateProgramDto,
    organizationId: string,
    workspaceId: string,
  ): Promise<Program> {
    const program = await this.getById(id, organizationId, workspaceId);

    if (!program) {
      throw new NotFoundException(`Program with ID ${id} not found`);
    }

    Object.assign(program, updateDto);

    return await this.programRepository.save(program);
  }

  // PHASE 6: Archive program
  async archive(
    id: string,
    organizationId: string,
    workspaceId: string,
  ): Promise<Program> {
    const program = await this.getById(id, organizationId, workspaceId);

    if (!program) {
      throw new NotFoundException(`Program with ID ${id} not found`);
    }

    program.status = ProgramStatus.ARCHIVED;

    return await this.programRepository.save(program);
  }

  // Legacy methods - kept for backward compatibility during migration
  async list(organizationId: string, portfolioId?: string): Promise<Program[]> {
    const where: any = { organizationId };
    if (portfolioId) {
      where.portfolioId = portfolioId;
    }

    return await this.programRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async getByIdLegacy(id: string, organizationId: string): Promise<Program> {
    const program = await this.programRepository.findOne({
      where: { id, organizationId },
      relations: ['portfolio', 'projects'],
    });

    if (!program) {
      throw new NotFoundException(`Program with ID ${id} not found`);
    }

    return program;
  }

  // Legacy method - kept for backward compatibility during migration
  async updateLegacy(
    id: string,
    updateDto: UpdateProgramDto,
    organizationId: string,
  ): Promise<Program> {
    const program = await this.getByIdLegacy(id, organizationId);

    // Don't allow portfolioId update via UpdateProgramDto
    const { portfolioId, ...updateData } = updateDto;
    Object.assign(program, updateData);

    return await this.programRepository.save(program);
  }

  // Legacy method - kept for backward compatibility during migration
  async assignProgramToProject(
    programId: string,
    dto: AssignProgramToProjectDto,
    organizationId: string,
  ): Promise<void> {
    const program = await this.getByIdLegacy(programId, organizationId);

    // Verify project belongs to organization
    const project = await this.projectRepository.findOne({
      where: {
        id: dto.projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException(
        `Project with ID ${dto.projectId} not found or does not belong to your organization`,
      );
    }

    // Verify project's workspace matches (if program has workspace constraint, add it)
    // For Phase 4.1, we allow cross-workspace assignment

    // Update project's programId
    project.programId = programId;
    await this.projectRepository.save(project);
  }

  async unassignProgramFromProject(
    projectId: string,
    organizationId: string,
  ): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException(
        `Project with ID ${projectId} not found or does not belong to your organization`,
      );
    }

    project.programId = null;
    await this.projectRepository.save(project);
  }

  async getProgramSummary(
    programId: string,
    workspaceId: string,
    startDate: string,
    endDate: string,
    organizationId: string,
  ): Promise<any> {
    // PHASE 6: Use workspace-scoped getById
    const program = await this.getById(programId, organizationId, workspaceId);

    if (!program) {
      throw new NotFoundException(`Program with ID ${programId} not found`);
    }

    // Get projects in program that belong to the workspace
    const projects = await this.projectRepository.find({
      where: {
        programId,
        organizationId,
        workspaceId,
      },
    });

    const projectIds = projects.map((p) => p.id);

    if (projectIds.length === 0) {
      return this.emptySummary(startDate, endDate);
    }

    return this.computeSummary(
      projectIds,
      workspaceId,
      startDate,
      endDate,
      organizationId,
    );
  }

  private async computeSummary(
    projectIds: string[],
    workspaceId: string,
    startDate: string,
    endDate: string,
    organizationId: string,
  ): Promise<any> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get projects with status
    const projects = await this.projectRepository.find({
      where: {
        id: In(projectIds),
        organizationId,
        workspaceId,
      },
    });

    // Get allocations for these projects
    const allocations = await this.allocationRepository.find({
      where: {
        organizationId,
        projectId: In(projectIds),
        startDate: LessThanOrEqual(end),
        endDate: MoreThanOrEqual(start),
      },
      relations: ['resource'],
    });

    // Get conflicts for resources in these projects
    const resourceIds = [...new Set(allocations.map((a) => a.resourceId))];
    const conflicts = await this.conflictRepository.find({
      where: {
        organizationId,
        resourceId: In(resourceIds),
        conflictDate: Between(start, end),
      },
    });

    // Get resources
    const resources = await this.resourceRepository.find({
      where: {
        id: In(resourceIds),
        organizationId,
      },
    });

    const resourceMap = new Map(resources.map((r) => [r.id, r]));

    // Compute week buckets (Monday-Sunday alignment)
    const weeks = this.computeWeekBuckets(start, end);

    // Compute metrics per week
    const weeklyMetrics = weeks.map((week) => {
      const weekStart = new Date(week.weekStart);
      const weekEnd = new Date(week.weekEnd);

      // Filter allocations for this week
      const weekAllocations = allocations.filter((alloc) => {
        const allocStart = new Date(alloc.startDate);
        const allocEnd = new Date(alloc.endDate);
        return allocStart <= weekEnd && allocEnd >= weekStart;
      });

      // Compute totals using CapacityMathHelper
      let totalHard = 0;
      let totalSoft = 0;

      for (const alloc of weekAllocations) {
        const resource = resourceMap.get(alloc.resourceId);
        const percentage = CapacityMathHelper.toPercentOfWeek(alloc, resource);

        if (alloc.type === AllocationType.HARD) {
          totalHard += percentage;
        } else if (alloc.type === AllocationType.SOFT) {
          totalSoft += percentage;
        }
      }

      const total = totalHard + totalSoft;
      const utilizationPercent = Math.min(total, 100);

      // Count conflicts for this week
      const weekConflicts = conflicts.filter((conflict) => {
        const conflictDate = new Date(conflict.conflictDate);
        return conflictDate >= weekStart && conflictDate <= weekEnd;
      });

      const unresolvedConflicts = weekConflicts.filter((c) => !c.resolved);

      // Count distinct resources in scope
      const distinctResources = new Set(
        weekAllocations.map((a) => a.resourceId),
      ).size;

      const conflictDensity =
        distinctResources > 0
          ? Math.round((unresolvedConflicts.length / distinctResources) * 100) /
            100
          : 0;

      return {
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
        totalHardPercent: Math.round(totalHard * 10) / 10,
        totalSoftPercent: Math.round(totalSoft * 10) / 10,
        totalPercent: Math.round(total * 10) / 10,
        utilizationPercent: Math.round(utilizationPercent * 10) / 10,
        conflictCount: weekConflicts.length,
        unresolvedConflictCount: unresolvedConflicts.length,
        conflictDensity,
      };
    });

    // Project status counts
    const statusCounts = projects.reduce(
      (acc, project) => {
        acc[project.status] = (acc[project.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      weeks: weeklyMetrics,
      projectCounts: {
        total: projects.length,
        byStatus: statusCounts,
      },
    };
  }

  private computeWeekBuckets(
    start: Date,
    end: Date,
  ): Array<{
    weekStart: string;
    weekEnd: string;
  }> {
    const weeks: Array<{ weekStart: string; weekEnd: string }> = [];
    let currentWeekStart = new Date(start);

    // Align to Monday (if not Monday, go to previous Monday)
    const dayOfWeek = currentWeekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    currentWeekStart.setDate(currentWeekStart.getDate() - daysToMonday);

    while (currentWeekStart <= end) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

      if (weekEnd > end) {
        weekEnd.setTime(end.getTime());
      }

      weeks.push({
        weekStart: currentWeekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
      });

      // Move to next Monday
      currentWeekStart = new Date(weekEnd);
      currentWeekStart.setDate(currentWeekStart.getDate() + 1);
    }

    return weeks;
  }

  private emptySummary(startDate: string, endDate: string): any {
    const weeks = this.computeWeekBuckets(
      new Date(startDate),
      new Date(endDate),
    );
    return {
      weeks: weeks.map((week) => ({
        ...week,
        totalHardPercent: 0,
        totalSoftPercent: 0,
        totalPercent: 0,
        utilizationPercent: 0,
        conflictCount: 0,
        unresolvedConflictCount: 0,
        conflictDensity: 0,
      })),
      projectCounts: {
        total: 0,
        byStatus: {},
      },
    };
  }
}
