import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkPhase } from '../entities/work-phase.entity';
import { WorkTask } from '../entities/work-task.entity';
import { Project } from '../../projects/entities/project.entity';
import { Program } from '../../programs/entities/program.entity';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';

export interface WorkPlanPhaseDto {
  id: string;
  name: string;
  sortOrder: number;
  reportingKey: string;
  isMilestone: boolean;
  startDate: string | null;
  dueDate: string | null;
  isLocked: boolean;
  tasks: WorkPlanTaskDto[];
}

export interface WorkPlanTaskDto {
  id: string;
  title: string;
  status: string;
  ownerId: string | null; // Changed from ownerUserId to ownerId for API consistency
  dueDate: string | null;
  blockedByCount: number;
  sortOrder: number | null;
}

export interface ProjectWorkPlanDto {
  projectId: string;
  projectName: string;
  phases: WorkPlanPhaseDto[];
}

export interface ProgramWorkPlanDto {
  programId: string;
  programName: string;
  childProjects: Array<{
    projectId: string;
    name: string;
    health: string | null;
    nextMilestone: string | null;
  }>;
  plans: ProjectWorkPlanDto[];
}

@Injectable()
export class WorkPlanService {
  constructor(
    @InjectRepository(WorkPhase)
    private readonly workPhaseRepository: Repository<WorkPhase>,
    @InjectRepository(WorkTask)
    private readonly workTaskRepository: Repository<WorkTask>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Program)
    private readonly programRepository: Repository<Program>,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  async getProjectWorkPlan(
    organizationId: string,
    workspaceId: string,
    projectId: string,
    userId: string,
    platformRole?: string,
  ): Promise<ProjectWorkPlanDto> {
    // Verify workspace access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
    );
    if (!canAccess) {
      throw new NotFoundException('Workspace access denied');
    }

    // Load project and verify it belongs to org and workspace
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        organizationId,
        workspaceId,
      },
      select: ['id', 'name'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Load phases ordered by sortOrder
    const phases = await this.workPhaseRepository.find({
      where: {
        organizationId,
        workspaceId,
        projectId,
      },
      order: {
        sortOrder: 'ASC',
      },
    });

    // Load all tasks for this project
    const allTasks = await this.workTaskRepository.find({
      where: {
        organizationId,
        workspaceId,
        projectId,
      },
      relations: ['phase'],
    });

    // Count blocked-by dependencies for each task
    const blockedByCounts = await this.workTaskRepository
      .createQueryBuilder('task')
      .leftJoin('work_task_dependencies', 'dep', 'dep.successor_task_id = task.id')
      .where('task.organization_id = :organizationId', { organizationId })
      .andWhere('task.workspace_id = :workspaceId', { workspaceId })
      .andWhere('task.project_id = :projectId', { projectId })
      .select('task.id', 'taskId')
      .addSelect('COUNT(dep.id)', 'blockedByCount')
      .groupBy('task.id')
      .getRawMany();

    const blockedByMap = new Map<string, number>();
    blockedByCounts.forEach((row) => {
      blockedByMap.set(row.taskId, parseInt(row.blockedByCount, 10) || 0);
    });

    // Group tasks by phase
    const tasksByPhaseId = new Map<string, WorkTask[]>();
    const tasksWithoutPhase: WorkTask[] = [];

    allTasks.forEach((task) => {
      if (task.phaseId) {
        if (!tasksByPhaseId.has(task.phaseId)) {
          tasksByPhaseId.set(task.phaseId, []);
        }
        tasksByPhaseId.get(task.phaseId)!.push(task);
      } else {
        tasksWithoutPhase.push(task);
      }
    });

    // Sort tasks within each phase by rank (nulls last)
    tasksByPhaseId.forEach((tasks) => {
      tasks.sort((a, b) => {
        if (a.rank === null && b.rank === null) return 0;
        if (a.rank === null) return 1;
        if (b.rank === null) return -1;
        return a.rank - b.rank;
      });
    });

    // Build phase DTOs with tasks
    const phaseDtos: WorkPlanPhaseDto[] = phases.map((phase) => {
      const phaseTasks = tasksByPhaseId.get(phase.id) || [];
      return {
        id: phase.id,
        name: phase.name,
        sortOrder: phase.sortOrder,
        reportingKey: phase.reportingKey,
        isMilestone: phase.isMilestone,
        startDate: phase.startDate ? phase.startDate.toISOString().split('T')[0] : null,
        dueDate: phase.dueDate ? phase.dueDate.toISOString().split('T')[0] : null,
        isLocked: phase.isLocked,
        tasks: phaseTasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          ownerId: task.assigneeUserId, // Changed from ownerUserId to ownerId
          dueDate: task.dueDate ? task.dueDate.toISOString().split('T')[0] : null,
          blockedByCount: blockedByMap.get(task.id) || 0,
          sortOrder: task.rank ? parseFloat(task.rank.toString()) : null,
        })),
      };
    });

    // If there are tasks without a phase, create a default "Unassigned" phase
    if (tasksWithoutPhase.length > 0) {
      tasksWithoutPhase.sort((a, b) => {
        if (a.rank === null && b.rank === null) return 0;
        if (a.rank === null) return 1;
        if (b.rank === null) return -1;
        return a.rank - b.rank;
      });

      phaseDtos.push({
        id: 'unassigned',
        name: 'Unassigned',
        sortOrder: 9999,
        reportingKey: 'unassigned',
        isMilestone: false,
        startDate: null,
        dueDate: null,
        isLocked: false,
        tasks: tasksWithoutPhase.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          ownerId: task.assigneeUserId, // Changed from ownerUserId to ownerId
          dueDate: task.dueDate ? task.dueDate.toISOString().split('T')[0] : null,
          blockedByCount: blockedByMap.get(task.id) || 0,
          sortOrder: task.rank ? parseFloat(task.rank.toString()) : null,
        })),
      });
    }

    return {
      projectId: project.id,
      projectName: project.name,
      phases: phaseDtos,
    };
  }

  async getProgramWorkPlan(
    organizationId: string,
    workspaceId: string,
    programId: string,
    userId: string,
    platformRole?: string,
  ): Promise<ProgramWorkPlanDto> {
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

    // Load program and verify it belongs to org
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

    // Load child projects (projects are workspace-scoped, programs are org-scoped)
    // Find projects in this workspace that belong to the program
    const projects = await this.projectRepository.find({
      where: {
        organizationId,
        workspaceId,
        programId: programId,
      },
      select: ['id', 'name'],
    });

    // For each project, get its work plan
    const plans: ProjectWorkPlanDto[] = [];
    const childProjects: Array<{
      projectId: string;
      name: string;
      health: string | null;
      nextMilestone: string | null;
    }> = [];

    for (const project of projects) {
      try {
        const plan = await this.getProjectWorkPlan(
          organizationId,
          workspaceId,
          project.id,
          userId,
          platformRole,
        );
        plans.push(plan);

        // Find next milestone from phases
        const nextMilestone = plan.phases
          .filter((p) => p.isMilestone && p.dueDate)
          .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))[0]?.dueDate || null;

        childProjects.push({
          projectId: project.id,
          name: project.name,
          health: null, // Will be calculated in Sprint 3
          nextMilestone,
        });
      } catch (error) {
        // Skip projects that fail (e.g., access denied)
        continue;
      }
    }

    return {
      programId: program.id,
      programName: program.name,
      childProjects,
      plans,
    };
  }
}

