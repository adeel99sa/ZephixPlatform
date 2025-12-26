import { Injectable, Inject } from '@nestjs/common';
import { Risk } from './entities/risk.entity';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { ResourceAllocation } from '../resources/entities/resource-allocation.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TenantAwareRepository } from '../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../tenancy/tenant-aware.repository';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { DataSource } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

interface RiskEvidence {
  type: string;
  description: string;
  data: any;
}

@Injectable()
export class RiskDetectionService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(Risk))
    private riskRepository: TenantAwareRepository<Risk>,
    @Inject(getTenantAwareRepositoryToken(Project))
    private projectRepository: TenantAwareRepository<Project>,
    @Inject(getTenantAwareRepositoryToken(Task))
    private taskRepository: TenantAwareRepository<Task>,
    @Inject(getTenantAwareRepositoryToken(ResourceAllocation))
    private allocationRepository: TenantAwareRepository<ResourceAllocation>,
    private readonly tenantContextService: TenantContextService,
    private readonly dataSource: DataSource,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runDailyRiskScan() {
    console.log('🔍 Running daily risk scan...');

    // Get all organizations using DataSource (infra-level access is allowed)
    const orgRepo = this.dataSource.getRepository(Organization);
    const organizations = await orgRepo.find({
      where: { status: 'active' as any },
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
            where: { status: 'active' as any },
          });

          console.log(
            `  Processing ${projects.length} projects for org ${org.id}`,
          );

          for (const project of projects) {
            await this.scanProjectRisks(project.id, org.id);
          }
        },
      );
    }

    console.log('✅ Daily risk scan completed');
  }

  async scanProjectRisks(
    projectId: string,
    organizationId: string,
  ): Promise<Risk[]> {
    const risks: Risk[] = [];

    // Rule 1: Resource Overallocation
    const overallocationRisk = await this.checkResourceOverallocation(
      projectId,
      organizationId,
    );
    if (overallocationRisk) risks.push(overallocationRisk);

    // Rule 2: Timeline Slippage
    const timelineRisk = await this.checkTimelineSlippage(
      projectId,
      organizationId,
    );
    if (timelineRisk) risks.push(timelineRisk);

    // Rule 3: Cascade Risk
    const cascadeRisk = await this.checkCascadeRisk(projectId, organizationId);
    if (cascadeRisk) risks.push(cascadeRisk);

    return risks;
  }

  private async checkResourceOverallocation(
    projectId: string,
    organizationId: string,
  ): Promise<Risk | null> {
    // organizationId parameter kept for backward compatibility
    // Use tenant-aware query builder - organizationId filter is automatic
    const allocations = await this.allocationRepository
      .qb('allocation')
      .leftJoinAndSelect('allocation.task', 'task')
      .leftJoinAndSelect('allocation.resource', 'resource')
      .andWhere('task.projectId = :projectId', { projectId })
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

      const risk = this.riskRepository.create({
        projectId,
        organizationId,
        type: 'resource_overallocation',
        severity: overallocated.some((a) => a.allocationPercentage > 120)
          ? 'high'
          : 'medium',
        title: 'Resource Overallocation Detected',
        description: `Multiple team members are allocated beyond capacity`,
        evidence: JSON.stringify(evidence),
        status: 'open',
        detectedAt: new Date(),
        mitigation: {
          suggestions: [
            'Reassign tasks to available resources',
            'Extend project timeline',
            'Hire additional resources',
          ],
        },
      });

      return await this.riskRepository.save(risk);
    }

    return null;
  }

  private async checkTimelineSlippage(
    projectId: string,
    organizationId: string,
  ): Promise<Risk | null> {
    // organizationId parameter kept for backward compatibility
    // Note: Task entity may need TenantAwareRepository if it has organizationId
    const tasks = await this.taskRepository.find({
      where: { projectId },
    });

    const delayedTasks = tasks.filter((task) => {
      if (!task.dueDate) return false;
      const now = new Date();
      const dueDate = new Date(task.dueDate);
      const daysLate = Math.floor(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      return daysLate > 3 && task.status !== 'done';
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

      const risk = this.riskRepository.create({
        projectId,
        organizationId,
        type: 'timeline_slippage',
        severity: delayedTasks.length > 5 ? 'high' : 'medium',
        title: 'Project Timeline at Risk',
        description: `Critical tasks are behind schedule`,
        evidence: JSON.stringify(evidence),
        status: 'open',
        detectedAt: new Date(),
        mitigation: {
          suggestions: [
            'Prioritize critical path tasks',
            'Add resources to delayed tasks',
            'Adjust project timeline',
          ],
        },
      });

      return await this.riskRepository.save(risk);
    }

    return null;
  }

  private async checkCascadeRisk(
    projectId: string,
    organizationId: string,
  ): Promise<Risk | null> {
    // organizationId parameter kept for backward compatibility
    // Note: Task entity may need TenantAwareRepository if it has organizationId
    const tasks = await this.taskRepository.find({
      where: { projectId },
    });

    // Check for dependency chains
    const blockedTasks = [];
    for (const task of tasks) {
      if (task.dependencies && task.dependencies.length > 0) {
        const blockingTasks = tasks.filter(
          (t) => task.dependencies.includes(t.id) && t.status !== 'done',
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

      const risk = this.riskRepository.create({
        projectId,
        organizationId,
        type: 'dependency_cascade',
        severity: 'high',
        title: 'Dependency Chain Risk',
        description: `Multiple tasks blocked creating cascade effect`,
        evidence: JSON.stringify(evidence),
        status: 'open',
        detectedAt: new Date(),
        mitigation: {
          suggestions: [
            'Prioritize blocking tasks',
            'Review and adjust dependencies',
            'Consider parallel execution where possible',
          ],
        },
      });

      return await this.riskRepository.save(risk);
    }

    return null;
  }
}
