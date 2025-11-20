import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Risk } from '../entities/risk.entity';
import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';
import { ResourceAllocation } from '../../resources/entities/resource-allocation.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

interface RiskEvidence {
  type: string;
  description: string;
  data: any;
}

@Injectable()
export class RiskDetectionService {
  constructor(
    @InjectRepository(Risk)
    private riskRepository: Repository<Risk>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(ResourceAllocation)
    private allocationRepository: Repository<ResourceAllocation>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runDailyRiskScan() {
    console.log('🔍 Running daily risk scan...');
    const projects = await this.projectRepository.find({
      where: { status: 'active' as any },
    });

    for (const project of projects) {
      await this.scanProjectRisks(project.id, project.organizationId);
    }
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
    const allocations = await this.allocationRepository
      .createQueryBuilder('allocation')
      .leftJoinAndSelect('allocation.task', 'task')
      .leftJoinAndSelect('allocation.resource', 'resource')
      .where('task.projectId = :projectId', { projectId })
      .andWhere('allocation.organizationId = :organizationId', {
        organizationId,
      })
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
        category: 'resource',
        riskLevel: overallocated.some((a) => a.allocationPercentage > 120)
          ? 'high'
          : 'medium',
        title: 'Resource Overallocation Detected',
        description: `Multiple team members are allocated beyond capacity`,
        evidence: JSON.stringify(evidence),
        status: 'active',
        // detectedAt: new Date(), // handled by createdAt
        mitigation: {
          suggestions: [
            'Reassign tasks to available resources',
            'Extend project timeline',
            'Hire additional resources',
          ],
        },
        // Required fields defaults
        probability: 0,
        impact: 0,
        riskScore: 0,
        impactBreakdown: { schedule: 0, budget: 0, scope: 0, quality: 0 },
        triggers: { warningSignals: [], leadIndicators: [], thresholds: [] },
        riskData: {},
      });

      return await this.riskRepository.save(risk);
    }

    return null;
  }

  private async checkTimelineSlippage(
    projectId: string,
    organizationId: string,
  ): Promise<Risk | null> {
    const tasks = await this.taskRepository.find({
      where: { projectId, organizationId },
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
        category: 'schedule',
        riskLevel: delayedTasks.length > 5 ? 'high' : 'medium',
        title: 'Project Timeline at Risk',
        description: `Critical tasks are behind schedule`,
        evidence: JSON.stringify(evidence),
        status: 'active',
        mitigation: {
          suggestions: [
            'Prioritize critical path tasks',
            'Add resources to delayed tasks',
            'Adjust project timeline',
          ],
        },
        // Required fields defaults
        probability: 0,
        impact: 0,
        riskScore: 0,
        impactBreakdown: { schedule: 0, budget: 0, scope: 0, quality: 0 },
        triggers: { warningSignals: [], leadIndicators: [], thresholds: [] },
        riskData: {},
      });

      return await this.riskRepository.save(risk);
    }

    return null;
  }

  private async checkCascadeRisk(
    projectId: string,
    organizationId: string,
  ): Promise<Risk | null> {
    const tasks = await this.taskRepository.find({
      where: { projectId, organizationId },
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
        category: 'schedule', // dependency_cascade fits schedule or technical
        riskLevel: 'high',
        title: 'Dependency Chain Risk',
        description: `Multiple tasks blocked creating cascade effect`,
        evidence: JSON.stringify(evidence),
        status: 'active',
        mitigation: {
          suggestions: [
            'Prioritize blocking tasks',
            'Review and adjust dependencies',
            'Consider parallel execution where possible',
          ],
        },
        // Required fields defaults
        probability: 0,
        impact: 0,
        riskScore: 0,
        impactBreakdown: { schedule: 0, budget: 0, scope: 0, quality: 0 },
        triggers: { warningSignals: [], leadIndicators: [], thresholds: [] },
        riskData: {},
      });

      return await this.riskRepository.save(risk);
    }

    return null;
  }
}
