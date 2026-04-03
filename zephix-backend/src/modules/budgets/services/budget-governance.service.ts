import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectBudgetEntity } from '../entities/project-budget.entity';
import { AuditService } from '../../audit/services/audit.service';
import { AuditEntityType, AuditAction } from '../../audit/audit.constants';

/**
 * Phase 2B: Budget Governance Service
 *
 * Evaluates budget mutations against threshold policy.
 * Follows ADR-007 governed mutation pattern: auth → scope → policy → domain → audit.
 *
 * MVP policy: WARN mode
 * - If a budget field change exceeds 20% of baseline, attach warning
 * - The mutation still proceeds (warn, not block)
 * - The governance decision is recorded as an audit event
 *
 * This aligns with Zephix's advisory governance model.
 */

export interface BudgetEvaluation {
  allowed: boolean;
  warning: boolean;
  reason: string | null;
  field: string;
  previousValue: number;
  newValue: number;
  changePercent: number;
  thresholdPercent: number;
}

export interface GovernedBudgetResult {
  evaluations: BudgetEvaluation[];
  hasWarnings: boolean;
  summary: string | null;
}

// MVP: warn when any budget field changes by more than 20% of baseline
const DEFAULT_CHANGE_THRESHOLD_PERCENT = 20;

@Injectable()
export class BudgetGovernanceService {
  private readonly logger = new Logger(BudgetGovernanceService.name);

  constructor(
    @InjectRepository(ProjectBudgetEntity)
    private readonly budgetRepo: Repository<ProjectBudgetEntity>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Evaluate a budget update against governance policy.
   *
   * Called from ProjectBudgetsService.update() before persisting changes.
   * Returns evaluation with warnings if thresholds exceeded.
   */
  async evaluateBudgetUpdate(input: {
    workspaceId: string;
    projectId: string;
    organizationId: string;
    actorUserId: string;
    changes: Record<string, string | undefined>;
    currentBudget: ProjectBudgetEntity;
  }): Promise<GovernedBudgetResult> {
    const evaluations: BudgetEvaluation[] = [];
    const baseline = parseFloat(input.currentBudget.baselineBudget) || 0;

    const fieldsToCheck: Array<{ key: string; label: string }> = [
      { key: 'baselineBudget', label: 'Baseline Budget' },
      { key: 'revisedBudget', label: 'Revised Budget' },
      { key: 'contingency', label: 'Contingency' },
      { key: 'approvedChangeBudget', label: 'Approved Change Budget' },
      { key: 'forecastAtCompletion', label: 'Forecast at Completion' },
    ];

    for (const field of fieldsToCheck) {
      const newValueStr = input.changes[field.key];
      if (newValueStr === undefined) continue;

      const newValue = parseFloat(newValueStr) || 0;
      const previousValue = parseFloat((input.currentBudget as any)[field.key]) || 0;

      if (newValue === previousValue) continue;

      const changeDelta = Math.abs(newValue - previousValue);
      const referenceValue = baseline > 0 ? baseline : previousValue;
      const changePercent = referenceValue > 0
        ? (changeDelta / referenceValue) * 100
        : (newValue > 0 ? 100 : 0);

      const overThreshold = changePercent > DEFAULT_CHANGE_THRESHOLD_PERCENT;

      evaluations.push({
        allowed: true, // MVP: always allow (warn mode)
        warning: overThreshold,
        reason: overThreshold
          ? `${field.label} change of ${changePercent.toFixed(1)}% exceeds ${DEFAULT_CHANGE_THRESHOLD_PERCENT}% threshold (${previousValue.toFixed(2)} → ${newValue.toFixed(2)})`
          : null,
        field: field.key,
        previousValue,
        newValue,
        changePercent: Math.round(changePercent * 10) / 10,
        thresholdPercent: DEFAULT_CHANGE_THRESHOLD_PERCENT,
      });
    }

    const hasWarnings = evaluations.some(e => e.warning);

    // Record governance audit event
    try {
      await this.auditService.record({
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
        actorUserId: input.actorUserId,
        actorPlatformRole: 'SYSTEM',
        entityType: AuditEntityType.PROJECT,
        entityId: input.projectId,
        action: AuditAction.GOVERNANCE_EVALUATE,
        metadata: {
          governanceType: 'BUDGET',
          decision: hasWarnings ? 'WARN' : 'ALLOW',
          evaluations: evaluations.map(e => ({
            field: e.field,
            previousValue: e.previousValue,
            newValue: e.newValue,
            changePercent: e.changePercent,
            thresholdPercent: e.thresholdPercent,
            warning: e.warning,
          })),
          baseline,
          projectId: input.projectId,
        },
      });
    } catch (err) {
      this.logger.error('Failed to record budget governance audit event', err);
    }

    if (hasWarnings) {
      const warnings = evaluations.filter(e => e.warning);
      this.logger.warn(
        `Budget governance warning: project ${input.projectId} — ${warnings.map(w => w.reason).join('; ')}`,
      );
    }

    return {
      evaluations,
      hasWarnings,
      summary: hasWarnings
        ? evaluations.filter(e => e.warning).map(e => e.reason).join('; ')
        : null,
    };
  }
}
