import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { WorkPhase } from '../entities/work-phase.entity';
import { WorkTask } from '../entities/work-task.entity';
import { Project } from '../../projects/entities/project.entity';
import { Program } from '../../programs/entities/program.entity';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';
import {
  PhaseGateDefinition,
  GateDefinitionStatus,
} from '../entities/phase-gate-definition.entity';
import { PhaseGateSubmission } from '../entities/phase-gate-submission.entity';
import { resolveCapabilities } from '../../projects/capabilities/capabilities.types';
import { AttributeDefinition, AttributeDataType } from '../../attributes/entities/attribute-definition.entity';
import { AttributeValue } from '../../attributes/entities/attribute-value.entity';
import { ProjectAttributeDefinition } from '../../attributes/entities/project-attribute-definition.entity';
import { AttributeValuesService } from '../../attributes/services/attribute-values.service';
import { NotFoundException } from '@nestjs/common';

export interface FlattenedAttribute {
  definitionId: string;
  key: string;
  label: string;
  value: unknown;
  isLocked: boolean;
}

export interface WorkPlanPhaseGate {
  definitionExists: boolean;
  submissionStatus: string | null;
  /**
   * OV-BE-1: id of the latest gate submission for this phase's gate, or null.
   * Lets the Overview gate strip deep-link a PM into submit/evidence without a
   * second round trip. Additive — existing fields are unchanged.
   */
  submissionId: string | null;
  evaluation: null;
}

export interface WorkPlanPhaseDto {
  id: string;
  name: string;
  sortOrder: number;
  reportingKey: string;
  /** Tailwind color name token (indigo, blue, emerald, amber, slate) or null */
  colorToken: string | null;
  isMilestone: boolean;
  startDate: string | null;
  dueDate: string | null;
  isLocked: boolean;
  gate: WorkPlanPhaseGate | null;
  tasks: WorkPlanTaskDto[];
}

export interface WorkPlanTaskDto {
  id: string;
  title: string;
  status: string;
  ownerId: string | null;
  dueDate: string | null;
  blockedByCount: number;
  sortOrder: number | null;
  attributes: FlattenedAttribute[];
}

export interface ProjectWorkPlanCapabilities {
  use_phases: boolean;
  use_iterations: boolean;
  use_gates: boolean;
  use_wip_limits: boolean;
}

export interface ProjectWorkPlanDto {
  projectId: string;
  projectName: string;
  projectState: string;
  structureLocked: boolean;
  capabilities: ProjectWorkPlanCapabilities;
  phases: WorkPlanPhaseDto[];
}

export interface ProgramWorkPlanDto {
  programId: string;
  programName: string;
  projects: Array<{
    projectId: string;
    projectName: string;
    projectState: string;
    structureLocked: boolean;
    phases: WorkPlanPhaseDto[];
  }>;
}

@Injectable()
export class WorkPlanService {
  private readonly logger = new Logger(WorkPlanService.name);

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
    // W2-A: Gate data — repos already registered in WorkManagementModule
    @InjectRepository(PhaseGateDefinition)
    private readonly gateDefRepo: Repository<PhaseGateDefinition>,
    @InjectRepository(PhaseGateSubmission)
    private readonly gateSubRepo: Repository<PhaseGateSubmission>,
    // W2-A: Attribute data — requires AttributesModule imported in WorkManagementModule
    @InjectRepository(AttributeDefinition)
    private readonly attrDefRepo: Repository<AttributeDefinition>,
    @InjectRepository(ProjectAttributeDefinition)
    private readonly projAttrDefRepo: Repository<ProjectAttributeDefinition>,
    @Optional()
    private readonly attributeValuesService?: AttributeValuesService,
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
      select: ['id', 'name', 'capabilities', 'state', 'structureLocked'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const capabilities = resolveCapabilities(project.capabilities ?? null);

    // Load phases ordered by sortOrder (exclude soft-deleted)
    const phases = await this.workPhaseRepository.find({
      where: {
        organizationId,
        workspaceId,
        projectId,
        deletedAt: IsNull(),
      },
      order: {
        sortOrder: 'ASC',
      },
    });

    // Load all tasks for this project (exclude soft-deleted)
    const allTasks = await this.workTaskRepository.find({
      where: {
        organizationId,
        workspaceId,
        projectId,
        deletedAt: IsNull(),
      },
      relations: ['phase'],
    });

    // Count blocked-by dependencies for each task
    const blockedByCounts = await this.workTaskRepository
      .createQueryBuilder('task')
      .leftJoin(
        'work_task_dependencies',
        'dep',
        'dep.successor_task_id = task.id',
      )
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

    // ── W2-A: Gate data (batch) ────────────────────────────────────────────
    const phaseIds = phases.map((p) => p.id);
    const gateDefsByPhaseId = new Map<string, PhaseGateDefinition>();
    if (phaseIds.length > 0) {
      const gateDefs = await this.gateDefRepo.find({
        where: {
          phaseId: In(phaseIds),
          organizationId,
          status: GateDefinitionStatus.ACTIVE,
          deletedAt: IsNull(),
        },
        select: ['id', 'phaseId'],
      });
      gateDefs.forEach((gd) => gateDefsByPhaseId.set(gd.phaseId, gd));
    }

    const latestSubByGateDefId = new Map<string, PhaseGateSubmission>();
    const gateDefIds = [...gateDefsByPhaseId.values()].map((gd) => gd.id);
    if (gateDefIds.length > 0) {
      const submissions = await this.gateSubRepo.find({
        where: {
          gateDefinitionId: In(gateDefIds),
          organizationId,
          deletedAt: IsNull(),
        },
        select: ['id', 'gateDefinitionId', 'status', 'createdAt'],
        order: { createdAt: 'DESC' },
      });
      for (const sub of submissions) {
        if (!latestSubByGateDefId.has(sub.gateDefinitionId)) {
          latestSubByGateDefId.set(sub.gateDefinitionId, sub);
        }
      }
    }

    // ── W2-A: Attribute data (batch) ──────────────────────────────────────
    const attrValuesByTaskId = new Map<string, AttributeValue[]>();
    let projAttrDefs: ProjectAttributeDefinition[] = [];
    const attrDefMap = new Map<string, AttributeDefinition>();

    const allTaskIds = allTasks.map((t) => t.id);
    if (allTaskIds.length > 0 && allTaskIds.length <= 200 && this.attributeValuesService) {
      try {
        const values = await this.attributeValuesService.findAllForTasks(
          allTaskIds,
          workspaceId,
          organizationId,
        );
        for (const v of values) {
          const arr = attrValuesByTaskId.get(v.workTaskId) ?? [];
          arr.push(v);
          attrValuesByTaskId.set(v.workTaskId, arr);
        }

        projAttrDefs = await this.projAttrDefRepo.find({
          where: { projectId, organizationId, workspaceId },
          order: { displayOrder: 'ASC' },
        });

        if (projAttrDefs.length > 0) {
          const defIds = projAttrDefs.map((p) => p.attributeDefinitionId);
          const defs = await this.attrDefRepo.find({ where: { id: In(defIds) } });
          defs.forEach((d) => attrDefMap.set(d.id, d));
        }
      } catch (err) {
        this.logger.warn(
          `Attribute loading failed for project ${projectId} — returning empty attributes`,
          err,
        );
      }
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    const buildTaskAttributes = (task: WorkTask): FlattenedAttribute[] => {
      const taskValues = attrValuesByTaskId.get(task.id) ?? [];
      const taskValuesByDefId = new Map(taskValues.map((v) => [v.attributeDefinitionId, v]));
      return projAttrDefs
        .map((pad): FlattenedAttribute | null => {
          const def = attrDefMap.get(pad.attributeDefinitionId);
          if (!def) return null;
          const val = taskValuesByDefId.get(pad.attributeDefinitionId) ?? null;
          return {
            definitionId: pad.attributeDefinitionId,
            key: def.key,
            label: def.label,
            value: val ? this.extractAttributeValue(val, def.dataType) : null,
            isLocked: pad.locked,
          };
        })
        .filter((a): a is FlattenedAttribute => a !== null);
    };

    const buildPhaseGate = (phaseId: string): WorkPlanPhaseGate | null => {
      const gateDef = gateDefsByPhaseId.get(phaseId) ?? null;
      if (!gateDef) return null;
      const latestSub = latestSubByGateDefId.get(gateDef.id) ?? null;
      return {
        definitionExists: true,
        submissionStatus: latestSub?.status ?? null,
        submissionId: latestSub?.id ?? null,
        evaluation: null,
      };
    };

    const formatDate = (d: Date | string | null | undefined): string | null => {
      if (!d) return null;
      return d instanceof Date
        ? d.toISOString().split('T')[0]
        : String(d).split('T')[0];
    };

    // Group tasks by phase
    const tasksByPhaseId = new Map<string, WorkTask[]>();
    const tasksWithoutPhase: WorkTask[] = [];

    allTasks.forEach((task) => {
      if (task.phaseId) {
        if (!tasksByPhaseId.has(task.phaseId)) {
          tasksByPhaseId.set(task.phaseId, []);
        }
        tasksByPhaseId.get(task.phaseId).push(task);
      } else {
        tasksWithoutPhase.push(task);
      }
    });

    // Sort tasks within each phase by rank (nulls last)
    const rankSort = (a: WorkTask, b: WorkTask): number => {
      if (a.rank === null && b.rank === null) return 0;
      if (a.rank === null) return 1;
      if (b.rank === null) return -1;
      return a.rank - b.rank;
    };
    tasksByPhaseId.forEach((tasks) => tasks.sort(rankSort));

    const mapTask = (task: WorkTask): WorkPlanTaskDto => ({
      id: task.id,
      title: task.title,
      status: task.status,
      ownerId: task.assigneeUserId,
      dueDate: formatDate(task.dueDate),
      blockedByCount: blockedByMap.get(task.id) || 0,
      sortOrder: task.rank ? parseFloat(task.rank.toString()) : null,
      attributes: buildTaskAttributes(task),
    });

    // Build phase DTOs with tasks
    const phaseDtos: WorkPlanPhaseDto[] = phases.map((phase) => {
      const phaseTasks = tasksByPhaseId.get(phase.id) || [];
      return {
        id: phase.id,
        name: phase.name,
        sortOrder: phase.sortOrder,
        reportingKey: phase.reportingKey,
        colorToken: phase.colorToken ?? null,
        isMilestone: phase.isMilestone,
        startDate: formatDate(phase.startDate),
        dueDate: formatDate(phase.dueDate),
        isLocked: phase.isLocked,
        gate: buildPhaseGate(phase.id),
        tasks: phaseTasks.map(mapTask),
      };
    });

    // If there are tasks without a phase, create a default "Unassigned" phase
    if (tasksWithoutPhase.length > 0) {
      tasksWithoutPhase.sort(rankSort);
      phaseDtos.push({
        id: 'unassigned',
        name: 'Unassigned',
        sortOrder: 9999,
        reportingKey: 'unassigned',
        colorToken: 'slate',
        isMilestone: false,
        startDate: null,
        dueDate: null,
        isLocked: false,
        gate: null,
        tasks: tasksWithoutPhase.map(mapTask),
      });
    }

    return {
      projectId: project.id,
      projectName: project.name,
      projectState: project.state || 'DRAFT',
      structureLocked: project.structureLocked || false,
      capabilities: {
        use_phases: capabilities.use_phases,
        use_iterations: capabilities.use_iterations,
        use_gates: capabilities.use_gates,
        use_wip_limits: capabilities.use_wip_limits,
      },
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

    // Load child projects (exclude trashed)
    const projects = await this.projectRepository.find({
      where: {
        organizationId,
        workspaceId,
        programId: programId,
        deletedAt: IsNull(),
      },
      select: ['id', 'name'],
    });

    // For each project, get its work plan
    const projectPlans: Array<{
      projectId: string;
      projectName: string;
      projectState: string;
      structureLocked: boolean;
      phases: WorkPlanPhaseDto[];
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
        projectPlans.push({
          projectId: plan.projectId,
          projectName: plan.projectName,
          projectState: plan.projectState,
          structureLocked: plan.structureLocked,
          phases: plan.phases,
        });
      } catch (error) {
        // Skip projects that fail (e.g., access denied)
        continue;
      }
    }

    return {
      programId: program.id,
      programName: program.name,
      projects: projectPlans,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private extractAttributeValue(val: AttributeValue, dataType: AttributeDataType): unknown {
    switch (dataType) {
      case AttributeDataType.TEXT:
      case AttributeDataType.LONG_TEXT:
      case AttributeDataType.URL:
      case AttributeDataType.EMAIL:
      case AttributeDataType.SINGLE_SELECT:
      case AttributeDataType.FILE_REFERENCE:
        return val.valueText;
      case AttributeDataType.NUMBER:
      case AttributeDataType.INTEGER:
      case AttributeDataType.DECIMAL:
      case AttributeDataType.CURRENCY:
      case AttributeDataType.PERCENTAGE:
      case AttributeDataType.RATING:
      case AttributeDataType.DURATION:
        return val.valueNumber;
      case AttributeDataType.BOOLEAN:
        return val.valueBoolean;
      case AttributeDataType.DATE:
        return val.valueDate;
      case AttributeDataType.DATETIME:
        return val.valueDatetime;
      case AttributeDataType.MULTI_SELECT:
      case AttributeDataType.PEOPLE:
      case AttributeDataType.RELATIONSHIP:
      case AttributeDataType.COMPUTED:
        return val.valueJson;
      default:
        return null;
    }
  }
}
