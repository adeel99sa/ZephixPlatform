import { Injectable, Logger, Inject } from '@nestjs/common';
import { Project, ProjectStatus } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { ResourceAllocation } from '../resources/entities/resource-allocation.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TenantAwareRepository } from '../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../tenancy/tenant-aware.repository';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { DataSource } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { WorkRisksService } from '../work-management/services/work-risks.service';
import { RiskSeverity } from '../work-management/entities/work-risk.entity';

interface RiskEvidence extends Record<string, unknown> {
  type: string;
  description: string;
  data: unknown;
}

interface BlockedTask {
  task: Task;
  blockedBy: Task[];
}

@Injectable()
export class RiskDetectionService {
  private readonly logger = new Logger(RiskDetectionService.name);

  constructor(
    @Inject(getTenantAwareRepositoryToken(Project))
    private projectRepository: TenantAwareRepository<Project>,
    @Inject(getTenantAwareRepositoryToken(Task))
    private taskRepository: TenantAwareRepository<Task>,
    @Inject(getTenantAwareRepositoryToken(ResourceAllocation))
    private allocationRepository: TenantAwareRepository<ResourceAllocation>,
    private readonly tenantContextService: TenantContextService,
    private readonly dataSource: DataSource,
    private readonly workRisksService: WorkRisksService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runDailyRiskScan() {
    // Skip in test mode
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    this.logger.log('Running daily risk scan');

    // Get all organizations using DataSource (infra-level access is allowed)
    const orgRepo = this.dataSource.getRepository(Organization);
    const organizations = await orgRepo.find({
      where: { status: 'active' },
      select: ['id'],
    });

    // Process each organization with tenant context using job helper
    for (const org of organizations) {
      await this.tenantContextService.runJobWithTenant(
        { organizationId: org.id },
        async () => {
          // Get active projects for this organization
          // TenantAwareRepository automatically scopes by organizationId
          const projects = await this.projectRepository.find({
            where: { status: ProjectStatus.ACTIVE },
          });

          this.logger.log(
            `Processing ${projects.length} projects for org ${org.id}`,
          );

          for (const project of projects) {
            await this.scanProjectRisks(project);
          }
        },
      );
    }

    this.logger.log('Daily risk scan completed');
  }

  async scanProjectRisks(project: Project): Promise<number> {
    if (!project.workspaceId) {
      this.logger.warn({
        action: 'risk_detection.skip_project_without_workspace',
        organizationId: project.organizationId,
        projectId: project.id,
      });
      return 0;
    }

    let changedCount = 0;

    // Rule 1: Resource Overallocation
    if (await this.checkResourceOverallocation(project)) {
      changedCount++;
    }

    // Rule 2: Timeline Slippage
    if (await this.checkTimelineSlippage(project)) {
      changedCount++;
    }

    // Rule 3: Cascade Risk
    if (await this.checkCascadeRisk(project)) {
      changedCount++;
    }

    return changedCount;
  }

  private async checkResourceOverallocation(
    project: Project,
  ): Promise<boolean> {
    const allocations = await this.allocationRepository
      .qb('allocation')
      .leftJoinAndSelect('allocation.resource', 'resource')
      .andWhere('allocation.projectId = :projectId', { projectId: project.id })
      .getMany();

    const overallocated = allocations.filter(
      (alloc) => alloc.allocationPercentage > 100,
    );

    if (overallocated.length > 0) {
      const evidence: RiskEvidence = {
        type: 'resource_overallocation',
        description: `${overallocated.length} resources are overallocated`,
        data: overallocated.map((alloc) => ({
          resourceName: alloc.resource?.name,
          allocation: alloc.allocationPercentage,
          // taskName: alloc.task?.name,
        })),
      };

      const maxAllocation = Math.max(
        ...overallocated.map((alloc) => alloc.allocationPercentage || 0),
      );

      await this.upsertDetectedRisk({
        project,
        riskType: 'resource_overallocation',
        title: 'Resource Overallocation Detected',
        description: 'Multiple team members are allocated beyond capacity',
        severity: maxAllocation > 120 ? RiskSeverity.HIGH : RiskSeverity.MEDIUM,
        evidence,
        mitigationPlan:
          'Reassign tasks to available resources; extend project timeline; or add capacity.',
      });

      return true;
    }

    return false;
  }

  private async checkTimelineSlippage(project: Project): Promise<boolean> {
    // Note: Task entity may need TenantAwareRepository if it has organizationId
    const tasks = await this.taskRepository.find({
      where: { projectId: project.id },
    });

    const delayedTasks = tasks.filter((task) => {
      if (!task.dueDate) return false;
      const now = new Date();
      const dueDate = new Date(task.dueDate);
      const daysLate = Math.floor(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      return (
        daysLate > 3 && task.status !== 'completed' && task.status !== 'done'
      );
    });

    if (delayedTasks.length > 0) {
      const evidence: RiskEvidence = {
        type: 'timeline_slippage',
        description: `${delayedTasks.length} tasks are delayed`,
        data: delayedTasks.map((task) => ({
          taskName: task.name,
          dueDate: task.dueDate,
          status: task.status,
          progress: task.progress,
        })),
      };

      await this.upsertDetectedRisk({
        project,
        riskType: 'timeline_slippage',
        title: 'Project Timeline at Risk',
        description: 'Critical tasks are behind schedule',
        severity:
          delayedTasks.length > 5 ? RiskSeverity.HIGH : RiskSeverity.MEDIUM,
        evidence,
        mitigationPlan:
          'Prioritize critical path tasks; add resources to delayed work; or adjust the timeline.',
      });

      return true;
    }

    return false;
  }

  private async checkCascadeRisk(project: Project): Promise<boolean> {
    // Note: Task entity may need TenantAwareRepository if it has organizationId
    const tasks = await this.taskRepository.find({
      where: { projectId: project.id },
    });

    // Check for dependency chains
    const blockedTasks: BlockedTask[] = [];
    for (const task of tasks) {
      const dependencyIds = this.getDependencyIds(task);
      if (dependencyIds.length > 0) {
        const blockingTasks = tasks.filter(
          (t) =>
            dependencyIds.includes(t.id) &&
            t.status !== 'completed' &&
            t.status !== 'done',
        );

        if (blockingTasks.length > 0) {
          blockedTasks.push({
            task,
            blockedBy: blockingTasks,
          });
        }
      }
    }

    if (blockedTasks.length > 2) {
      const evidence: RiskEvidence = {
        type: 'cascade_risk',
        description: `${blockedTasks.length} tasks are blocked by dependencies`,
        data: blockedTasks.map((item) => ({
          taskName: item.task.name,
          blockedBy: item.blockedBy.map((t) => t.name),
        })),
      };

      await this.upsertDetectedRisk({
        project,
        riskType: 'dependency_cascade',
        title: 'Dependency Chain Risk',
        description: 'Multiple tasks blocked creating cascade effect',
        severity: RiskSeverity.HIGH,
        evidence,
        mitigationPlan:
          'Prioritize blocking tasks; review dependencies; or split work for parallel execution.',
      });

      return true;
    }

    return false;
  }

  private async upsertDetectedRisk(input: {
    project: Project;
    riskType: string;
    title: string;
    description: string;
    severity: RiskSeverity;
    evidence: RiskEvidence;
    mitigationPlan: string;
  }): Promise<void> {
    try {
      const result = await this.workRisksService.upsertSystemRisk({
        organizationId: input.project.organizationId,
        workspaceId: input.project.workspaceId,
        projectId: input.project.id,
        title: input.title,
        description: input.description,
        severity: input.severity,
        source: 'cron_detection',
        riskType: input.riskType,
        evidence: input.evidence,
        detectedAt: new Date(),
        mitigationPlan: input.mitigationPlan,
      });

      this.logger.log({
        action: 'risk_detection.upserted_work_risk',
        organizationId: input.project.organizationId,
        workspaceId: input.project.workspaceId,
        projectId: input.project.id,
        riskType: input.riskType,
        result: result.action,
        riskId: result.risk.id,
      });
    } catch (error) {
      this.logger.error({
        action: 'risk_detection.upsert_failed',
        organizationId: input.project.organizationId,
        workspaceId: input.project.workspaceId,
        projectId: input.project.id,
        riskType: input.riskType,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private getDependencyIds(task: Task): string[] {
    const dependencies = task.dependencies;
    if (!Array.isArray(dependencies)) {
      return [];
    }

    return dependencies.filter(
      (id): id is string => typeof id === 'string' && id.length > 0,
    );
  }
}
