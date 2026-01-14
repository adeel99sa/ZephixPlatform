import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Program } from '../entities/program.entity';
import { Project } from '../../projects/entities/project.entity';
import { WorkItem, WorkItemStatus } from '../../work-items/entities/work-item.entity';
import { ResourceConflict } from '../../resources/entities/resource-conflict.entity';
import { Risk } from '../../risks/entities/risk.entity';
import { computeHealthV1 } from '../../shared/rollups/health-v1';
import {
  ProgramRollupResponseDto,
  ProgramBasicDto,
  ProjectSummaryDto,
  TotalsDto,
  HealthDto,
} from '../dto/program-rollup.dto';
import { ProjectStatus, ProjectHealth } from '../../projects/entities/project.entity';

@Injectable()
export class ProgramsRollupService {
  constructor(
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
   * Get program rollup - workspace scoped
   *
   * @param programId - Program ID
   * @param organizationId - Organization ID
   * @param workspaceId - Workspace ID
   * @returns Program rollup response
   */
  async getRollup(
    programId: string,
    organizationId: string,
    workspaceId: string,
  ): Promise<ProgramRollupResponseDto> {
    // Load program - must exist in workspace
    const program = await this.programRepository.findOne({
      where: {
        id: programId,
        organizationId,
        workspaceId,
      },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    // Load projects in program - workspace scoped
    const projects = await this.projectRepository.find({
      where: {
        programId,
        organizationId,
        workspaceId,
      },
      select: ['id', 'name', 'status', 'startDate', 'endDate', 'health'],
    });

    const projectIds = projects.map((p) => p.id);

    // Compute totals
    const totals = await this.computeTotals(
      projectIds,
      organizationId,
      workspaceId,
      projects,
    );

    // Compute health
    const health = computeHealthV1({
      projectsAtRisk: totals.projectsAtRisk,
      workItemsOverdue: totals.workItemsOverdue,
      resourceConflictsOpen: totals.resourceConflictsOpen,
    });

    // Build program basic info
    const programBasic: ProgramBasicDto = {
      id: program.id,
      name: program.name,
      status: program.status,
      workspaceId: program.workspaceId,
      portfolioId: program.portfolioId,
    };

    // Build project summaries (limit to 50)
    const projectSummaries: ProjectSummaryDto[] = projects
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
      program: programBasic,
      totals,
      health,
      projects: projectSummaries,
    };
  }

  /**
   * Compute rollup totals for projects
   */
  private async computeTotals(
    projectIds: string[],
    organizationId: string,
    workspaceId: string,
    projects: Project[],
  ): Promise<TotalsDto> {
    // If no projects, return zeros
    if (projectIds.length === 0) {
      return {
        projectsTotal: 0,
        projectsActive: 0,
        projectsAtRisk: 0,
        workItemsOpen: 0,
        workItemsOverdue: 0,
        resourceConflictsOpen: 0,
        risksActive: 0,
      };
    }

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
    const workItems = await this.workItemRepository.find({
      where: {
        projectId: In(projectIds),
        organizationId,
        workspaceId,
      },
      select: ['id', 'status', 'dueDate'],
    });

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
    // Risk entity has projectId, so we can query directly
    const risks = await this.riskRepository.find({
      where: {
        projectId: In(projectIds),
        organizationId,
        status: 'open',
      },
    });

    const risksActive = risks.length;

    return {
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
