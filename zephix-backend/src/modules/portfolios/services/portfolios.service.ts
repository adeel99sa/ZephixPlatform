import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual, MoreThanOrEqual, Between } from 'typeorm';
import { Portfolio } from '../entities/portfolio.entity';
import { PortfolioProject } from '../entities/portfolio-project.entity';
import { Program } from '../../programs/entities/program.entity';
import { Project } from '../../projects/entities/project.entity';
import { ResourceAllocation } from '../../resources/entities/resource-allocation.entity';
import { ResourceConflict } from '../../resources/entities/resource-conflict.entity';
import { Resource } from '../../resources/entities/resource.entity';
import { AllocationType } from '../../resources/enums/allocation-type.enum';
import { CapacityMathHelper } from '../../resources/helpers/capacity-math.helper';
import { PortfolioStatus } from '../entities/portfolio.entity';
import { CreatePortfolioDto } from '../dto/create-portfolio.dto';
import { UpdatePortfolioDto } from '../dto/update-portfolio.dto';
import { AddProjectsToPortfolioDto } from '../dto/add-projects-to-portfolio.dto';
import { RemoveProjectsFromPortfolioDto } from '../dto/remove-projects-from-portfolio.dto';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { Inject } from '@nestjs/common';

@Injectable()
export class PortfoliosService {
  private readonly logger = new Logger(PortfoliosService.name);

  constructor(
    @InjectRepository(Portfolio)
    private readonly portfolioRepository: Repository<Portfolio>,
    @InjectRepository(PortfolioProject)
    private readonly portfolioProjectRepository: Repository<PortfolioProject>,
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

  async create(
    createDto: CreatePortfolioDto,
    organizationId: string,
    userId: string,
  ): Promise<Portfolio> {
    const portfolio = this.portfolioRepository.create({
      ...createDto,
      organizationId,
      createdById: userId,
      status: createDto.status || PortfolioStatus.ACTIVE,
    });

    return await this.portfolioRepository.save(portfolio);
  }

  async list(organizationId: string): Promise<Portfolio[]> {
    return await this.portfolioRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async getById(id: string, organizationId: string): Promise<Portfolio> {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id, organizationId },
      relations: ['programs', 'portfolioProjects', 'portfolioProjects.project'],
    });

    if (!portfolio) {
      throw new NotFoundException(`Portfolio with ID ${id} not found`);
    }

    return portfolio;
  }

  async update(
    id: string,
    updateDto: UpdatePortfolioDto,
    organizationId: string,
  ): Promise<Portfolio> {
    const portfolio = await this.getById(id, organizationId);

    Object.assign(portfolio, updateDto);

    return await this.portfolioRepository.save(portfolio);
  }

  async addProjects(
    portfolioId: string,
    dto: AddProjectsToPortfolioDto,
    organizationId: string,
  ): Promise<void> {
    const portfolio = await this.getById(portfolioId, organizationId);

    // Verify all projects belong to the organization
    const projects = await this.projectRepository.find({
      where: {
        id: In(dto.projectIds),
        organizationId,
      },
    });

    if (projects.length !== dto.projectIds.length) {
      throw new BadRequestException(
        'Some projects not found or do not belong to your organization',
      );
    }

    // Create join rows (ignore duplicates)
    for (const projectId of dto.projectIds) {
      const existing = await this.portfolioProjectRepository.findOne({
        where: { portfolioId, projectId },
      });

      if (!existing) {
        await this.portfolioProjectRepository.save({
          organizationId,
          portfolioId,
          projectId,
        });
      }
    }
  }

  async removeProjects(
    portfolioId: string,
    dto: RemoveProjectsFromPortfolioDto,
    organizationId: string,
  ): Promise<void> {
    await this.getById(portfolioId, organizationId);

    await this.portfolioProjectRepository.delete({
      portfolioId,
      projectId: In(dto.projectIds),
    });
  }

  async getPortfolioSummary(
    portfolioId: string,
    workspaceId: string,
    startDate: string,
    endDate: string,
    organizationId: string,
  ): Promise<any> {
    const portfolio = await this.getById(portfolioId, organizationId);

    // Get projects in portfolio that belong to the workspace
    const portfolioProjects = await this.portfolioProjectRepository.find({
      where: { portfolioId, organizationId },
      relations: ['project'],
    });

    const projectIds = portfolioProjects
      .map((pp) => pp.projectId)
      .filter((pid) => {
        const pp = portfolioProjects.find((p) => p.projectId === pid);
        return pp?.project?.workspaceId === workspaceId;
      });

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
    const statusCounts = projects.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      weeks: weeklyMetrics,
      projectCounts: {
        total: projects.length,
        byStatus: statusCounts,
      },
    };
  }

  private computeWeekBuckets(start: Date, end: Date): Array<{
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
    const weeks = this.computeWeekBuckets(new Date(startDate), new Date(endDate));
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

