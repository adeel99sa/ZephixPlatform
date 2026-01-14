import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Portfolio } from '../entities/portfolio.entity';
import { PortfolioProject } from '../entities/portfolio-project.entity';
import { Program } from '../../programs/entities/program.entity';
import { Project } from '../../projects/entities/project.entity';
import { WorkItem, WorkItemStatus } from '../../work-items/entities/work-item.entity';
import { ResourceConflict } from '../../resources/entities/resource-conflict.entity';
import { Risk } from '../../risks/entities/risk.entity';
import { computeHealthV1 } from '../../shared/rollups/health-v1';
import {
  PortfolioRollupResponseDto,
  PortfolioBasicDto,
  ProgramSummaryDto,
  ProjectSummaryDto,
  TotalsDto,
  HealthDto,
} from '../dto/portfolio-rollup.dto';
import { ProjectStatus, ProjectHealth } from '../../projects/entities/project.entity';

@Injectable()
export class PortfoliosRollupService {
  constructor(
    @InjectRepository(Portfolio)
    private readonly portfolioRepository: Repository<Portfolio>,
    @InjectRepository(PortfolioProject)
    private readonly portfolioProjectRepository: Repository<PortfolioProject>,
    @InjectRepository(Program)
    private readonly programRepository: Repository<Program>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(WorkItem)
    private readonly workItemRepository: Repository<WorkItem>,
    @InjectRepository(ResourceConflict)
    private readonly conflictRepository: Repository<ResourceConflict>,
    @InjectRepository(Risk)
    private readonly riskRepository: Repository<Risk>,
  ) {}

  /**
   * Get portfolio rollup - workspace scoped
   *
   * @param portfolioId - Portfolio ID
   * @param organizationId - Organization ID
   * @param workspaceId - Workspace ID
   * @returns Portfolio rollup response
   */
  async getRollup(
    portfolioId: string,
    organizationId: string,
    workspaceId: string,
  ): Promise<PortfolioRollupResponseDto> {
    // Load portfolio - must exist in workspace
    const portfolio = await this.portfolioRepository.findOne({
      where: {
        id: portfolioId,
        organizationId,
        workspaceId,
      },
    });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    // Load programs in portfolio - workspace scoped
    const programs = await this.programRepository.find({
      where: {
        portfolioId,
        organizationId,
        workspaceId,
      },
      select: ['id', 'name', 'status'],
    });

    const programIds = programs.map((p) => p.id);

    // Load projects under programs - workspace scoped
    const projectsUnderPrograms = programIds.length > 0
      ? await this.projectRepository.find({
          where: {
            programId: In(programIds),
            organizationId,
            workspaceId,
          },
          select: ['id', 'name', 'status', 'startDate', 'endDate', 'health', 'programId'],
        })
      : [];

    // Load direct portfolio projects (via portfolio_projects join table)
    const portfolioProjects = await this.portfolioProjectRepository.find({
      where: {
        portfolioId,
        organizationId,
      },
      relations: ['project'],
    });

    // Filter to workspace and exclude projects already in programs
    const directProjectIds = new Set(
      projectsUnderPrograms.map((p) => p.id),
    );
    const projectsDirect = portfolioProjects
      .filter(
        (pp) =>
          pp.project?.workspaceId === workspaceId &&
          !directProjectIds.has(pp.projectId),
      )
      .map((pp) => pp.project!)
      .filter((p) => p !== null && p !== undefined);

    // Combine all projects and deduplicate
    const allProjects = [
      ...projectsUnderPrograms,
      ...projectsDirect,
    ];
    const uniqueProjects = Array.from(
      new Map(allProjects.map((p) => [p.id, p])).values(),
    );

    const allProjectIds = uniqueProjects.map((p) => p.id);

    // Compute totals
    const totals = await this.computeTotals(
      allProjectIds,
      organizationId,
      workspaceId,
      uniqueProjects,
      programIds,
    );

    // Compute health
    const health = computeHealthV1({
      projectsAtRisk: totals.projectsAtRisk,
      workItemsOverdue: totals.workItemsOverdue,
      resourceConflictsOpen: totals.resourceConflictsOpen,
    });

    // Build portfolio basic info
    const portfolioBasic: PortfolioBasicDto = {
      id: portfolio.id,
      name: portfolio.name,
      status: portfolio.status,
      workspaceId: portfolio.workspaceId,
    };

    // Build program summaries with their project counts
    const programSummaries: ProgramSummaryDto[] = await Promise.all(
      programs.map(async (program) => {
        const programProjects = projectsUnderPrograms.filter(
          (p) => p.programId === program.id,
        );
        const programProjectIds = programProjects.map((p) => p.id);

        // Compute program-level health
        const programProjectsAtRisk = programProjects.filter(
          (p) => p.health === ProjectHealth.AT_RISK || p.health === ProjectHealth.BLOCKED,
        ).length;

        // Get work items and conflicts for this program's projects
        const programWorkItems = programProjectIds.length > 0
          ? await this.workItemRepository.find({
              where: {
                projectId: In(programProjectIds),
                organizationId,
                workspaceId,
              },
              select: ['id', 'status', 'dueDate'],
            })
          : [];

        const now = new Date();
        const programWorkItemsOverdue = programWorkItems.filter(
          (wi) =>
            wi.status !== WorkItemStatus.DONE &&
            wi.dueDate &&
            new Date(wi.dueDate) < now,
        ).length;

        const allConflicts = await this.conflictRepository.find({
          where: {
            organizationId,
            resolved: false,
          },
        });

        const programConflictsOpen = allConflicts.filter((conflict) => {
          if (!conflict.affectedProjects || !Array.isArray(conflict.affectedProjects)) {
            return false;
          }
          return conflict.affectedProjects.some(
            (ap: any) => programProjectIds.includes(ap.projectId),
          );
        }).length;

        const programHealth = computeHealthV1({
          projectsAtRisk: programProjectsAtRisk,
          workItemsOverdue: programWorkItemsOverdue,
          resourceConflictsOpen: programConflictsOpen,
        });

        return {
          id: program.id,
          name: program.name,
          status: program.status,
          projectsTotal: programProjects.length,
          projectsAtRisk: programProjectsAtRisk,
          healthStatus: programHealth.status,
        };
      }),
    );

    // Build direct project summaries (limit to 50)
    const directProjectSummaries: ProjectSummaryDto[] = projectsDirect
      .slice(0, 50)
      .map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        startDate: p.startDate?.toISOString() || null,
        endDate: p.endDate?.toISOString() || null,
        healthStatus: p.health || null,
      }));

    return {
      version: 1,
      portfolio: portfolioBasic,
      totals,
      health,
      programs: programSummaries,
      projectsDirect: directProjectSummaries,
    };
  }

  /**
   * Compute rollup totals for portfolio
   */
  private async computeTotals(
    projectIds: string[],
    organizationId: string,
    workspaceId: string,
    projects: Project[],
    programIds: string[],
  ): Promise<TotalsDto> {
    // Programs total
    const programsTotal = programIds.length;

    // Projects metrics
    const projectsTotal = projects.length;
    const projectsActive = projects.filter(
      (p) => p.status === ProjectStatus.ACTIVE,
    ).length;
    const projectsAtRisk = projects.filter(
      (p) => p.health === ProjectHealth.AT_RISK || p.health === ProjectHealth.BLOCKED,
    ).length;

    // Work items metrics - workspace and project scoped
    const now = new Date();
    const workItems = projectIds.length > 0
      ? await this.workItemRepository.find({
          where: {
            projectId: In(projectIds),
            organizationId,
            workspaceId,
          },
          select: ['id', 'status', 'dueDate'],
        })
      : [];

    const workItemsOpen = workItems.filter(
      (wi) => wi.status !== WorkItemStatus.DONE,
    ).length;

    const workItemsOverdue = workItems.filter(
      (wi) =>
        wi.status !== WorkItemStatus.DONE &&
        wi.dueDate &&
        new Date(wi.dueDate) < now,
    ).length;

    // Resource conflicts - filter by affected projects in workspace
    const allConflicts = await this.conflictRepository.find({
      where: {
        organizationId,
        resolved: false,
      },
    });

    // Filter conflicts where affectedProjects includes any projectId in our list
    const resourceConflictsOpen = allConflicts.filter((conflict) => {
      if (!conflict.affectedProjects || !Array.isArray(conflict.affectedProjects)) {
        return false;
      }
      return conflict.affectedProjects.some(
        (ap: any) => projectIds.includes(ap.projectId),
      );
    }).length;

    // Risks - filter by projectId and status
    const risks = projectIds.length > 0
      ? await this.riskRepository.find({
          where: {
            projectId: In(projectIds),
            organizationId,
            status: 'open',
          },
        })
      : [];

    const risksActive = risks.length;

    return {
      programsTotal,
      projectsTotal,
      projectsActive,
      projectsAtRisk,
      workItemsOpen,
      workItemsOverdue,
      resourceConflictsOpen,
      risksActive,
    };
  }
}
