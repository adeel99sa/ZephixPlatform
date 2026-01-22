import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectHealth } from '../../projects/entities/project.entity';
import { Program } from '../../programs/entities/program.entity';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import {
  ProjectHealthService,
  NeedsAttentionItem,
} from './project-health.service';

const HEALTH_LABELS: Record<ProjectHealth, string> = {
  [ProjectHealth.HEALTHY]: 'On track',
  [ProjectHealth.AT_RISK]: 'Needs attention',
  [ProjectHealth.BLOCKED]: 'Blocked',
};

export interface ProjectOverviewDto {
  projectId: string;
  projectName: string;
  projectState: string;
  structureLocked: boolean;
  startedAt: string | null;
  deliveryOwnerUserId: string | null;
  dateRange: {
    startDate: string | null;
    dueDate: string | null;
  };
  healthCode: ProjectHealth;
  healthLabel: string;
  behindTargetDays: number | null;
  needsAttention: NeedsAttentionItem[];
  nextActions: NeedsAttentionItem[];
}

export interface ProgramOverviewDto {
  programId: string;
  programName: string;
  healthCode: ProjectHealth;
  healthLabel: string;
  needsAttention: Array<
    NeedsAttentionItem & { projectId: string; projectName: string }
  >;
  nextActions: Array<
    NeedsAttentionItem & { projectId: string; projectName: string }
  >;
}

/**
 * Sprint 3: Project and Program overview service
 */
@Injectable()
export class ProjectOverviewService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Program)
    private readonly programRepository: Repository<Program>,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly projectHealthService: ProjectHealthService,
  ) {}

  async getProjectOverview(
    organizationId: string,
    workspaceId: string,
    projectId: string,
    userId: string,
    platformRole?: string,
  ): Promise<ProjectOverviewDto> {
    // Verify workspace access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      platformRole,
    );
    if (!canAccess) {
      throw new NotFoundException('Workspace access denied');
    }

    // Load project (including health fields)
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        organizationId,
        workspaceId,
      },
      select: [
        'id',
        'name',
        'state',
        'structureLocked',
        'startedAt',
        'projectManagerId',
        'startDate',
        'endDate',
        'health',
        'behindTargetDays',
      ],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Read health from Project entity (source of truth)
    // needsAttention is computed on-demand
    const healthResult = await this.projectHealthService.computeHealth(
      projectId,
      organizationId,
      workspaceId,
    );

    // Use stored health if available, otherwise use computed
    const health = project.health || healthResult.health;
    const behindTargetDays =
      project.behindTargetDays !== null
        ? project.behindTargetDays
        : healthResult.behindTargetDays;

    // Get top 3 next actions from needsAttention
    const nextActions = healthResult.needsAttention.slice(0, 3);

    return {
      projectId: project.id,
      projectName: project.name,
      projectState: project.state || 'DRAFT',
      structureLocked: project.structureLocked || false,
      startedAt: project.startedAt ? project.startedAt.toISOString() : null,
      deliveryOwnerUserId: project.projectManagerId || null,
      dateRange: {
        startDate: project.startDate
          ? project.startDate.toISOString().split('T')[0]
          : null,
        dueDate: project.endDate
          ? project.endDate.toISOString().split('T')[0]
          : null,
      },
      healthCode: health,
      healthLabel: HEALTH_LABELS[health],
      behindTargetDays,
      needsAttention: healthResult.needsAttention,
      nextActions,
    };
  }

  async getProgramOverview(
    organizationId: string,
    workspaceId: string,
    programId: string,
    userId: string,
    platformRole?: string,
  ): Promise<ProgramOverviewDto> {
    // Verify workspace access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      platformRole,
    );
    if (!canAccess) {
      throw new NotFoundException('Workspace access denied');
    }

    // Load program
    const program = await this.programRepository.findOne({
      where: {
        id: programId,
        organizationId,
      },
      select: ['id', 'name'],
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    // Load child projects in this workspace
    const projects = await this.projectRepository.find({
      where: {
        programId,
        organizationId,
        workspaceId,
      },
      select: ['id', 'name'],
    });

    // Compute health for each child project
    const projectHealthResults: Array<{
      projectId: string;
      projectName: string;
      health: ProjectHealth;
      needsAttention: NeedsAttentionItem[];
    }> = [];

    for (const project of projects) {
      const healthResult = await this.projectHealthService.computeHealth(
        project.id,
        organizationId,
        workspaceId,
      );
      projectHealthResults.push({
        projectId: project.id,
        projectName: project.name,
        health: healthResult.health,
        needsAttention: healthResult.needsAttention,
      });
    }

    // Aggregate program health
    // If any child project BLOCKED, program BLOCKED
    // Else if any child project AT_RISK, program AT_RISK
    // Else HEALTHY
    let programHealth: ProjectHealth = ProjectHealth.HEALTHY;
    if (projectHealthResults.some((r) => r.health === ProjectHealth.BLOCKED)) {
      programHealth = ProjectHealth.BLOCKED;
    } else if (
      projectHealthResults.some((r) => r.health === ProjectHealth.AT_RISK)
    ) {
      programHealth = ProjectHealth.AT_RISK;
    }

    // Merge needsAttention from all child projects with project refs
    const allNeedsAttention: Array<
      NeedsAttentionItem & { projectId: string; projectName: string }
    > = [];
    for (const result of projectHealthResults) {
      for (const item of result.needsAttention) {
        allNeedsAttention.push({
          ...item,
          projectId: result.projectId,
          projectName: result.projectName,
        });
      }
    }

    // Get top 3 next actions
    const nextActions = allNeedsAttention.slice(0, 3);

    return {
      programId: program.id,
      programName: program.name,
      healthCode: programHealth,
      healthLabel: HEALTH_LABELS[programHealth],
      needsAttention: allNeedsAttention,
      nextActions,
    };
  }
}
