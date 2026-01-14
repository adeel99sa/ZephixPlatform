import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { SignalsReport } from '../entities/signals-report.entity';
import { Risk } from '../../risks/entities/risk.entity';
import { Task } from '../../tasks/entities/task.entity';
import { MaterializedProjectMetrics } from '../../analytics/entities/materialized-project-metrics.entity';

/**
 * Phase 8: Signals Service
 * Detects patterns and generates weekly signals reports
 */
@Injectable()
export class SignalsService {
  private readonly logger = new Logger(SignalsService.name);

  constructor(
    @InjectRepository(SignalsReport)
    private signalsReportRepo: Repository<SignalsReport>,
    @InjectRepository(Risk)
    private riskRepo: Repository<Risk>,
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
    @InjectRepository(MaterializedProjectMetrics)
    private projectMetricsRepo: Repository<MaterializedProjectMetrics>,
  ) {}

  /**
   * Generate weekly signals report for an organization
   */
  async generateWeeklyReport(organizationId: string): Promise<SignalsReport> {
    this.logger.log(
      `Generating weekly signals report for org ${organizationId}`,
    );

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const weekEnd = now;

    const reportId = `signals-${organizationId}-${weekStart.toISOString().split('T')[0]}`;
    const weekRange = `[${weekStart.toISOString().split('T')[0]},${weekEnd.toISOString().split('T')[0]}]`;

    // Check if report already exists
    const existing = await this.signalsReportRepo.findOne({
      where: { organizationId, reportId },
    });
    if (existing) {
      this.logger.debug(`Report already exists: ${reportId}`);
      return existing;
    }

    // Detect patterns
    const patterns = await this.detectPatterns(
      organizationId,
      weekStart,
      weekEnd,
    );

    // Generate summary
    const summary = this.generateSummary(patterns);

    // Create report
    const report = this.signalsReportRepo.create({
      organizationId,
      reportId,
      weekRange,
      status: 'completed',
      summary,
      topRisksJson: patterns.topRisks,
      predictionsJson: patterns.predictions,
      actionsJson: patterns.actions,
    });

    return await this.signalsReportRepo.save(report);
  }

  /**
   * Detect patterns across projects, risks, and tasks
   */
  private async detectPatterns(
    organizationId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<{
    topRisks: any[];
    predictions: any[];
    actions: any[];
  }> {
    // Get all risks created or updated in the week
    const recentRisks = await this.riskRepo.find({
      where: {
        organizationId,
        createdAt: MoreThan(weekStart),
      },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    // Get blocked tasks
    const blockedTasks = await this.taskRepo.find({
      where: {
        organizationId,
        isBlocked: true,
      },
    });

    // Get overdue tasks
    const overdueTasks = await this.taskRepo.find({
      where: {
        organizationId,
        dueDate: LessThan(new Date()),
        status: MoreThan('completed'),
      },
    });

    // Get project metrics
    const projectMetrics = await this.projectMetricsRepo.find({
      where: {
        project: {
          organizationId,
        },
      },
      relations: ['project'],
    });

    // Detect patterns
    const topRisks = this.identifyTopRisks(recentRisks);
    const predictions = this.generatePredictions(
      recentRisks,
      blockedTasks,
      overdueTasks,
      projectMetrics,
    );
    const actions = this.recommendActions(predictions, topRisks);

    return { topRisks, predictions, actions };
  }

  /**
   * Identify top risks by severity and recency
   */
  private identifyTopRisks(risks: Risk[]): any[] {
    return risks
      .map((risk) => ({
        id: risk.id,
        title: risk.title,
        severity: risk.severity,
        type: risk.type,
        projectId: risk.projectId,
        detectedAt: risk.detectedAt,
        score: this.calculateRiskScore(risk),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  /**
   * Generate predictions based on patterns
   */
  private generatePredictions(
    risks: Risk[],
    blockedTasks: Task[],
    overdueTasks: Task[],
    projectMetrics: MaterializedProjectMetrics[],
  ): any[] {
    const predictions: any[] = [];

    // Schedule slip prediction
    const highRiskProjects = projectMetrics.filter((m) => m.health === 'red');
    if (highRiskProjects.length > 0) {
      predictions.push({
        type: 'schedule_slip',
        severity: 'high',
        probability: 0.75,
        description: `${highRiskProjects.length} projects showing red health indicators`,
        affectedProjects: highRiskProjects.map((m) => m.projectId),
      });
    }

    // Vendor commitment decay detection
    const vendorRisks = risks.filter(
      (r) =>
        r.type?.toLowerCase().includes('vendor') ||
        r.type?.toLowerCase().includes('supplier'),
    );
    if (vendorRisks.length > 3) {
      predictions.push({
        type: 'vendor_commitment_decay',
        severity: 'medium',
        probability: 0.6,
        description: `Multiple vendor-related risks detected (${vendorRisks.length})`,
        affectedRisks: vendorRisks.map((r) => r.id),
      });
    }

    // Blocked tasks pattern
    if (blockedTasks.length > 5) {
      predictions.push({
        type: 'task_blockage',
        severity: 'medium',
        probability: 0.7,
        description: `${blockedTasks.length} tasks currently blocked`,
        affectedTasks: blockedTasks.map((t) => t.id),
      });
    }

    // Overdue tasks trend
    if (overdueTasks.length > 10) {
      predictions.push({
        type: 'deadline_miss_trend',
        severity: 'high',
        probability: 0.8,
        description: `${overdueTasks.length} tasks past their due dates`,
        affectedTasks: overdueTasks.map((t) => t.id),
      });
    }

    return predictions;
  }

  /**
   * Recommend actions based on predictions
   */
  private recommendActions(predictions: any[], topRisks: any[]): any[] {
    const actions: any[] = [];

    // Actions for schedule slips
    const scheduleSlips = predictions.filter((p) => p.type === 'schedule_slip');
    if (scheduleSlips.length > 0) {
      actions.push({
        type: 'review_schedule',
        priority: 'high',
        description: 'Review project timelines and resource allocation',
        projects: scheduleSlips.flatMap((p) => p.affectedProjects || []),
      });
    }

    // Actions for high-risk items
    const criticalRisks = topRisks.filter(
      (r) => r.severity === 'critical' || r.severity === 'high',
    );
    if (criticalRisks.length > 0) {
      actions.push({
        type: 'mitigate_risks',
        priority: 'high',
        description: `Address ${criticalRisks.length} high-priority risks`,
        risks: criticalRisks.map((r) => r.id),
      });
    }

    // Actions for blocked tasks
    const blockedPredictions = predictions.filter(
      (p) => p.type === 'task_blockage',
    );
    if (blockedPredictions.length > 0) {
      actions.push({
        type: 'unblock_tasks',
        priority: 'medium',
        description: 'Investigate and resolve task blockages',
        tasks: blockedPredictions.flatMap((p) => p.affectedTasks || []),
      });
    }

    return actions;
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(patterns: {
    topRisks: any[];
    predictions: any[];
    actions: any[];
  }): string {
    const riskCount = patterns.topRisks.length;
    const predictionCount = patterns.predictions.length;
    const actionCount = patterns.actions.length;

    return `Weekly Signals Report: ${riskCount} top risks identified, ${predictionCount} predictions generated, ${actionCount} recommended actions.`;
  }

  /**
   * Calculate risk score for prioritization
   */
  private calculateRiskScore(risk: Risk): number {
    const severityScores: Record<string, number> = {
      low: 1,
      medium: 3,
      high: 7,
      critical: 10,
    };
    const baseScore = severityScores[risk.severity?.toLowerCase()] || 1;

    // Boost score for recent risks
    const daysSinceDetection = Math.floor(
      (Date.now() - new Date(risk.detectedAt).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const recencyBoost = Math.max(0, 5 - daysSinceDetection);

    return baseScore + recencyBoost;
  }

  /**
   * Get latest signals report
   */
  async getLatestReport(organizationId: string): Promise<SignalsReport | null> {
    return await this.signalsReportRepo.findOne({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }
}
