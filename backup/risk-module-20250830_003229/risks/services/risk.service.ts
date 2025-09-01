import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource, LessThan, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RiskSignal } from '../entities/risk-signal.entity';
import { Project } from '../../projects/entities/project.entity';
import { WorkItem } from '../../work-items/entities/work-item.entity';
import { ResourceAllocation } from '../../resources/entities/resource-allocation.entity';

export interface RiskDetectionResult {
  projectId: string;
  projectName: string;
  riskType: RiskType;
  severity: RiskSeverity;
  details: Record<string, any>;
  detectedAt: Date;
  requiresAcknowledgment: boolean;
}

export type RiskType = 
  | 'RESOURCE_OVERALLOCATION'
  | 'SCHEDULE_VARIANCE'
  | 'BUDGET_VARIANCE'
  | 'DEPENDENCY_BLOCKING'
  | 'SCOPE_CREEP';

export type RiskSeverity = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'CRITICAL';

export interface RiskThresholds {
  resourceOverallocation: number; // >100%
  scheduleVarianceDays: number; // >3 days
  scheduleCompletionThreshold: number; // <50%
  budgetVariancePercent: number; // >20%
  dependencyBlockingDays: number; // >3 days
  scopeCreepTasks: number; // >3 tasks
}

export interface ProjectRiskProfile {
  projectId: string;
  projectName: string;
  overallRiskScore: number;
  riskCounts: Record<RiskType, number>;
  severityBreakdown: Record<RiskSeverity, number>;
  lastScanDate: Date;
  nextScanDate: Date;
}

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);
  private readonly defaultThresholds: RiskThresholds = {
    resourceOverallocation: 100,
    scheduleVarianceDays: 3,
    scheduleCompletionThreshold: 50,
    budgetVariancePercent: 20,
    dependencyBlockingDays: 3,
    scopeCreepTasks: 3,
  };

  constructor(
    @InjectRepository(RiskSignal)
    private readonly riskSignalRepository: Repository<RiskSignal>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(WorkItem)
    private readonly workItemRepository: Repository<WorkItem>,
    @InjectRepository(ResourceAllocation)
    private readonly resourceAllocationRepository: Repository<ResourceAllocation>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Daily automated risk scanning job
   * Runs every day at 6:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async runDailyRiskScan(): Promise<void> {
    this.logger.log('Starting daily risk scan...');
    
    try {
      // Get all active projects
      const activeProjects = await this.projectRepository.find({
        where: { status: 'active' },
        select: ['id', 'name', 'organizationId'],
      });

      let totalRisksDetected = 0;
      
      for (const project of activeProjects) {
        const risks = await this.scanProjectRisks(project.id, project.organizationId);
        totalRisksDetected += risks.length;
        
        // Create risk signals for detected risks
        for (const risk of risks) {
          await this.createRiskSignal(risk);
        }
      }

      this.logger.log(`Daily risk scan completed. Detected ${totalRisksDetected} risks across ${activeProjects.length} projects.`);
    } catch (error) {
      this.logger.error(`Daily risk scan failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Scan a specific project for all types of risks
   */
  async scanProjectRisks(projectId: string, organizationId: string): Promise<RiskDetectionResult[]> {
    const risks: RiskDetectionResult[] = [];

    // 1. Resource Overallocation Risk
    const resourceRisks = await this.detectResourceOverallocationRisk(projectId, organizationId);
    risks.push(...resourceRisks);

    // 2. Schedule Variance Risk
    const scheduleRisks = await this.detectScheduleVarianceRisk(projectId);
    risks.push(...scheduleRisks);

    // 3. Budget Variance Risk
    const budgetRisks = await this.detectBudgetVarianceRisk(projectId);
    risks.push(...budgetRisks);

    // 4. Dependency Blocking Risk
    const dependencyRisks = await this.detectDependencyBlockingRisk(projectId);
    risks.push(...dependencyRisks);

    // 5. Scope Creep Risk
    const scopeRisks = await this.detectScopeCreepRisk(projectId);
    risks.push(...scopeRisks);

    return risks;
  }

  /**
   * Rule 1: Detect resource overallocation (>100%)
   */
  private async detectResourceOverallocationRisk(projectId: string, organizationId: string): Promise<RiskDetectionResult[]> {
    const risks: RiskDetectionResult[] = [];

    try {
      // Get resource allocations for the project
      const allocations = await this.resourceAllocationRepository
        .createQueryBuilder('allocation')
        .leftJoinAndSelect('allocation.project', 'project')
        .where('allocation.projectId = :projectId', { projectId })
        .andWhere('project.organizationId = :organizationId', { organizationId })
        .getMany();

      // Group by resource and date range to find overallocation
      const resourceAllocationMap = new Map<string, Array<{ startDate: Date; endDate: Date; percentage: number }>>();
      
      for (const allocation of allocations) {
        const key = allocation.resourceId;
        if (!resourceAllocationMap.has(key)) {
          resourceAllocationMap.set(key, []);
        }
        resourceAllocationMap.get(key)!.push({
          startDate: allocation.startDate,
          endDate: allocation.endDate,
          percentage: allocation.allocationPercentage,
        });
      }

      // Check for overallocation in overlapping periods
      for (const [resourceId, allocations] of resourceAllocationMap) {
        const sortedAllocations = allocations.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
        
        for (let i = 0; i < sortedAllocations.length; i++) {
          const current = sortedAllocations[i];
          let totalAllocation = current.percentage;

          // Check overlapping allocations
          for (let j = 0; j < sortedAllocations.length; j++) {
            if (i === j) continue;
            
            const other = sortedAllocations[j];
            if (this.datesOverlap(current.startDate, current.endDate, other.startDate, other.endDate)) {
              totalAllocation += other.percentage;
            }
          }

          if (totalAllocation > this.defaultThresholds.resourceOverallocation) {
            risks.push({
              projectId,
              projectName: 'Project', // Would get from project context
              riskType: 'RESOURCE_OVERALLOCATION',
              severity: this.calculateSeverity(totalAllocation, this.defaultThresholds.resourceOverallocation),
              details: {
                resourceId,
                totalAllocation: Math.round(totalAllocation * 100) / 100,
                threshold: this.defaultThresholds.resourceOverallocation,
                period: {
                  startDate: current.startDate,
                  endDate: current.endDate,
                },
                overallocationPercent: Math.round((totalAllocation - this.defaultThresholds.resourceOverallocation) * 100) / 100,
              },
              detectedAt: new Date(),
              requiresAcknowledgment: true,
            });
            break; // Only create one risk per resource
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to detect resource overallocation risk: ${error.message}`);
    }

    return risks;
  }

  /**
   * Rule 2: Detect schedule variance (>3 days overdue, <50% complete)
   */
  private async detectScheduleVarianceRisk(projectId: string): Promise<RiskDetectionResult[]> {
    const risks: RiskDetectionResult[] = [];

    try {
      const project = await this.projectRepository.findOne({
        where: { id: projectId },
        select: ['id', 'name', 'endDate', 'status'],
      });

      if (!project || !project.endDate) {
        return risks;
      }

      // Get work items for the project
      const workItems = await this.workItemRepository.find({
        where: { projectId },
        select: ['id', 'title', 'plannedEnd', 'actualEnd', 'status', 'effortPoints'],
      });

      const today = new Date();
      let totalPlannedEffort = 0;
      let totalCompletedEffort = 0;
      let overdueTasks = 0;
      let totalTasks = workItems.length;

      for (const workItem of workItems) {
        if (workItem.effortPoints) {
          totalPlannedEffort += workItem.effortPoints;
          
          if (workItem.status === 'done') {
            totalCompletedEffort += workItem.effortPoints;
          }
        }

        // Check for overdue tasks
        if (workItem.plannedEnd && workItem.status !== 'done' && workItem.plannedEnd < today) {
          const daysOverdue = Math.ceil((today.getTime() - workItem.plannedEnd.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysOverdue > this.defaultThresholds.scheduleVarianceDays) {
            overdueTasks++;
          }
        }
      }

      // Calculate completion percentage
      const completionPercentage = totalPlannedEffort > 0 ? (totalCompletedEffort / totalPlannedEffort) * 100 : 0;

      // Check project end date variance
      const projectDaysOverdue = project.endDate < today ? 
        Math.ceil((today.getTime() - project.endDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      // Create risks based on thresholds
      if (projectDaysOverdue > this.defaultThresholds.scheduleVarianceDays) {
        risks.push({
          projectId,
          projectName: project.name,
          riskType: 'SCHEDULE_VARIANCE',
          severity: this.calculateSeverity(projectDaysOverdue, this.defaultThresholds.scheduleVarianceDays),
          details: {
            daysOverdue: projectDaysOverdue,
            threshold: this.defaultThresholds.scheduleVarianceDays,
            projectEndDate: project.endDate,
            overdueTasks,
            totalTasks,
            completionPercentage: Math.round(completionPercentage * 100) / 100,
          },
          detectedAt: new Date(),
          requiresAcknowledgment: true,
        });
      }

      if (completionPercentage < this.defaultThresholds.scheduleCompletionThreshold) {
        risks.push({
          projectId,
          projectName: project.name,
          riskType: 'SCHEDULE_VARIANCE',
          severity: this.calculateSeverity(this.defaultThresholds.scheduleCompletionThreshold - completionPercentage, 20),
          details: {
            completionPercentage: Math.round(completionPercentage * 100) / 100,
            threshold: this.defaultThresholds.scheduleCompletionThreshold,
            totalPlannedEffort,
            totalCompletedEffort,
            overdueTasks,
            totalTasks,
          },
          detectedAt: new Date(),
          requiresAcknowledgment: true,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to detect schedule variance risk: ${error.message}`);
    }

    return risks;
  }

  /**
   * Rule 3: Detect budget variance (>20% over budget)
   */
  private async detectBudgetVarianceRisk(projectId: string): Promise<RiskDetectionResult[]> {
    const risks: RiskDetectionResult[] = [];

    try {
      // This would typically integrate with financial systems
      // For now, we'll use a placeholder implementation
      // In production, this would call financial integration services
      
      // Placeholder: Assume we have budget data
      const budgetData = {
        plannedBudget: 100000,
        actualSpent: 125000,
        variance: -25000,
        variancePercent: 25,
      };

      if (budgetData.variancePercent > this.defaultThresholds.budgetVariancePercent) {
        risks.push({
          projectId,
          projectName: 'Project', // Would get from project
          riskType: 'BUDGET_VARIANCE',
          severity: this.calculateSeverity(budgetData.variancePercent, this.defaultThresholds.budgetVariancePercent),
          details: {
            plannedBudget: budgetData.plannedBudget,
            actualSpent: budgetData.actualSpent,
            variance: budgetData.variance,
            variancePercent: budgetData.variancePercent,
            threshold: this.defaultThresholds.budgetVariancePercent,
            overBudgetAmount: Math.abs(budgetData.variance),
          },
          detectedAt: new Date(),
          requiresAcknowledgment: true,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to detect budget variance risk: ${error.message}`);
    }

    return risks;
  }

  /**
   * Rule 4: Detect dependency blocking (>3 days)
   */
  private async detectDependencyBlockingRisk(projectId: string): Promise<RiskDetectionResult[]> {
    const risks: RiskDetectionResult[] = [];

    try {
      // Get blocked work items
      const blockedWorkItems = await this.workItemRepository.find({
        where: { 
          projectId,
          status: 'blocked',
        },
        select: ['id', 'title', 'status', 'createdAt', 'updatedAt'],
      });

      const today = new Date();
      
      for (const workItem of blockedWorkItems) {
        // Calculate days blocked (using updatedAt as proxy for when blocking started)
        const daysBlocked = Math.ceil((today.getTime() - workItem.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysBlocked > this.defaultThresholds.dependencyBlockingDays) {
          risks.push({
            projectId,
            projectName: 'Project', // Would get from project
            riskType: 'DEPENDENCY_BLOCKING',
            severity: this.calculateSeverity(daysBlocked, this.defaultThresholds.dependencyBlockingDays),
            details: {
              workItemId: workItem.id,
              workItemTitle: workItem.title,
              daysBlocked,
              threshold: this.defaultThresholds.dependencyBlockingDays,
              blockedSince: workItem.updatedAt,
              status: workItem.status,
            },
            detectedAt: new Date(),
            requiresAcknowledgment: true,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to detect dependency blocking risk: ${error.message}`);
    }

    return risks;
  }

  /**
   * Rule 5: Detect scope creep (>3 tasks added post-baseline)
   */
  private async detectScopeCreepRisk(projectId: string): Promise<RiskDetectionResult[]> {
    const risks: RiskDetectionResult[] = [];

    try {
      // Get project creation date as baseline
      const project = await this.projectRepository.findOne({
        where: { id: projectId },
        select: ['id', 'name', 'createdAt'],
      });

      if (!project) {
        return risks;
      }

      // Get work items created after project baseline (with some buffer)
      const baselineDate = new Date(project.createdAt.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days after project creation
      
      const postBaselineWorkItems = await this.workItemRepository.find({
        where: { 
          projectId,
          createdAt: MoreThan(baselineDate),
        },
        select: ['id', 'title', 'type', 'createdAt'],
      });

      if (postBaselineWorkItems.length > this.defaultThresholds.scopeCreepTasks) {
        risks.push({
          projectId,
          projectName: project.name,
          riskType: 'SCOPE_CREEP',
          severity: this.calculateSeverity(postBaselineWorkItems.length, this.defaultThresholds.scopeCreepTasks),
          details: {
            baselineDate,
            postBaselineTasks: postBaselineWorkItems.length,
            threshold: this.defaultThresholds.scopeCreepTasks,
            addedTasks: postBaselineWorkItems.map(item => ({
              id: item.id,
              title: item.title,
              type: item.type,
              addedAt: item.createdAt,
            })),
            scopeIncreasePercent: Math.round((postBaselineWorkItems.length / this.defaultThresholds.scopeCreepTasks) * 100),
          },
          detectedAt: new Date(),
          requiresAcknowledgment: true,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to detect scope creep risk: ${error.message}`);
    }

    return risks;
  }

  /**
   * Calculate risk severity based on threshold values
   */
  private calculateSeverity(value: number, threshold: number): RiskSeverity {
    const ratio = value / threshold;
    
    if (ratio >= 3.0) return 'CRITICAL';
    if (ratio >= 2.0) return 'RED';
    if (ratio >= 1.5) return 'ORANGE';
    if (ratio >= 1.0) return 'YELLOW';
    return 'GREEN';
  }

  /**
   * Create a risk signal in the database
   */
  async createRiskSignal(risk: RiskDetectionResult): Promise<RiskSignal> {
    const riskSignal = new RiskSignal();
    riskSignal.organizationId = 'org-placeholder'; // Would get from context
    riskSignal.projectId = risk.projectId;
    riskSignal.signalType = this.mapRiskTypeToSignalType(risk.riskType) as 'OVERALLOCATION' | 'DEADLINE_SLIP';
    riskSignal.severity = this.mapSeverityToSignalSeverity(risk.severity) as 'low' | 'medium' | 'high' | 'critical';
    riskSignal.details = risk.details;
    riskSignal.status = 'unack';

    return this.riskSignalRepository.save(riskSignal);
  }

  /**
   * Map risk type to signal type
   */
  private mapRiskTypeToSignalType(riskType: RiskType): string {
    switch (riskType) {
      case 'RESOURCE_OVERALLOCATION':
        return 'OVERALLOCATION';
      case 'SCHEDULE_VARIANCE':
        return 'DEADLINE_SLIP';
      case 'BUDGET_VARIANCE':
        return 'DEADLINE_SLIP'; // Using existing type
      case 'DEPENDENCY_BLOCKING':
        return 'DEADLINE_SLIP'; // Using existing type
      case 'SCOPE_CREEP':
        return 'DEADLINE_SLIP'; // Using existing type
      default:
        return 'DEADLINE_SLIP';
    }
  }

  /**
   * Map severity to signal severity
   */
  private mapSeverityToSignalSeverity(severity: RiskSeverity): string {
    switch (severity) {
      case 'GREEN':
        return 'low';
      case 'YELLOW':
        return 'low';
      case 'ORANGE':
        return 'medium';
      case 'RED':
        return 'high';
      case 'CRITICAL':
        return 'critical';
      default:
        return 'medium';
    }
  }

  /**
   * Get project risk profile
   */
  async getProjectRiskProfile(projectId: string): Promise<ProjectRiskProfile> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      select: ['id', 'name'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Get all risk signals for the project
    const riskSignals = await this.riskSignalRepository.find({
      where: { projectId },
      select: ['signalType', 'severity', 'createdAt'],
    });

    // Calculate risk counts and severity breakdown
    const riskCounts: Record<RiskType, number> = {
      RESOURCE_OVERALLOCATION: 0,
      SCHEDULE_VARIANCE: 0,
      BUDGET_VARIANCE: 0,
      DEPENDENCY_BLOCKING: 0,
      SCOPE_CREEP: 0,
    };

    const severityBreakdown: Record<RiskSeverity, number> = {
      GREEN: 0,
      YELLOW: 0,
      ORANGE: 0,
      RED: 0,
      CRITICAL: 0,
    };

    for (const signal of riskSignals) {
      // Map signal type back to risk type
      const riskType = this.mapSignalTypeToRiskType(signal.signalType);
      if (riskType) {
        riskCounts[riskType]++;
      }

      // Map severity back to risk severity
      const riskSeverity = this.mapSignalSeverityToRiskSeverity(signal.severity);
      if (riskSeverity) {
        severityBreakdown[riskSeverity]++;
      }
    }

    // Calculate overall risk score (weighted by severity)
    const severityWeights = { GREEN: 1, YELLOW: 2, ORANGE: 3, RED: 4, CRITICAL: 5 };
    const totalWeightedScore = Object.entries(severityBreakdown).reduce(
      (sum, [severity, count]) => sum + (count * severityWeights[severity as RiskSeverity]), 0
    );
    const overallRiskScore = totalWeightedScore / Math.max(Object.values(severityBreakdown).reduce((sum, count) => sum + count, 0), 1);

    return {
      projectId: project.id,
      projectName: project.name,
      overallRiskScore: Math.round(overallRiskScore * 100) / 100,
      riskCounts,
      severityBreakdown,
      lastScanDate: new Date(), // Would get from last scan
      nextScanDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next day
    };
  }

  /**
   * Map signal type back to risk type
   */
  private mapSignalTypeToRiskType(signalType: string): RiskType | null {
    switch (signalType) {
      case 'OVERALLOCATION':
        return 'RESOURCE_OVERALLOCATION';
      case 'DEADLINE_SLIP':
        return 'SCHEDULE_VARIANCE'; // Default mapping
      default:
        return null;
    }
  }

  /**
   * Map signal severity back to risk severity
   */
  private mapSignalSeverityToRiskSeverity(signalSeverity: string): RiskSeverity | null {
    switch (signalSeverity) {
      case 'low':
        return 'YELLOW';
      case 'medium':
        return 'ORANGE';
      case 'high':
        return 'RED';
      case 'critical':
        return 'CRITICAL';
      default:
        return null;
    }
  }

  /**
   * Check if two date ranges overlap
   */
  private datesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 < end2 && start2 < end1;
  }

  /**
   * Get all active risk signals for an organization
   */
  async getActiveRiskSignals(organizationId: string): Promise<RiskSignal[]> {
    return this.riskSignalRepository.find({
      where: { 
        organizationId,
        status: 'unack',
      },
      relations: ['project'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Acknowledge a risk signal
   */
  async acknowledgeRiskSignal(signalId: string, acknowledgedBy: string): Promise<RiskSignal> {
    const signal = await this.riskSignalRepository.findOne({
      where: { id: signalId },
    });

    if (!signal) {
      throw new NotFoundException('Risk signal not found');
    }

    signal.status = 'ack';
    signal.acknowledgedBy = acknowledgedBy;
    signal.acknowledgedAt = new Date();

    return this.riskSignalRepository.save(signal);
  }

  /**
   * Resolve a risk signal
   */
  async resolveRiskSignal(signalId: string, resolvedBy: string): Promise<RiskSignal> {
    const signal = await this.riskSignalRepository.findOne({
      where: { id: signalId },
    });

    if (!signal) {
      throw new NotFoundException('Risk signal not found');
    }

    signal.status = 'resolved';
    signal.resolvedBy = resolvedBy;
    signal.resolvedAt = new Date();

    return this.riskSignalRepository.save(signal);
  }

  /**
   * Update risk thresholds for an organization
   */
  async updateRiskThresholds(organizationId: string, thresholds: Partial<RiskThresholds>): Promise<void> {
    // In a real implementation, this would store thresholds in a configuration table
    // For now, we'll update the default thresholds
    Object.assign(this.defaultThresholds, thresholds);
    this.logger.log(`Updated risk thresholds for organization ${organizationId}`);
  }

  /**
   * Get risk statistics for an organization
   */
  async getOrganizationRiskStats(organizationId: string): Promise<{
    totalRisks: number;
    activeRisks: number;
    acknowledgedRisks: number;
    resolvedRisks: number;
    severityBreakdown: Record<string, number>;
    riskTypeBreakdown: Record<string, number>;
  }> {
    const signals = await this.riskSignalRepository.find({
      where: { organizationId },
    });

    const stats = {
      totalRisks: signals.length,
      activeRisks: signals.filter(s => s.status === 'unack').length,
      acknowledgedRisks: signals.filter(s => s.status === 'ack').length,
      resolvedRisks: signals.filter(s => s.status === 'resolved').length,
      severityBreakdown: {},
      riskTypeBreakdown: {},
    };

    // Calculate breakdowns
    for (const signal of signals) {
      // Severity breakdown
      const severity = signal.severity;
      stats.severityBreakdown[severity] = (stats.severityBreakdown[severity] || 0) + 1;

      // Risk type breakdown
      const riskType = this.mapSignalTypeToRiskType(signal.signalType);
      if (riskType) {
        stats.riskTypeBreakdown[riskType] = (stats.riskTypeBreakdown[riskType] || 0) + 1;
      }
    }

    return stats;
  }
}
