import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  GovernanceEvaluation,
  EvaluationDecision,
  EvaluationReason,
  TransitionType,
} from '../entities/governance-evaluation.entity';
import { GovernanceEntityType, EnforcementMode } from '../entities/governance-rule-set.entity';
import {
  GovernanceRuleResolverService,
  ResolvedRule,
} from './governance-rule-resolver.service';
import {
  evaluateAllConditions,
  ConditionContext,
} from '../engine/condition-evaluators';
import { computeInputsHash } from '../engine/inputs-hash';
import { extractRequiredFields, buildInputsSnapshot } from '../engine/snapshot-builder';

export interface EvaluationResult {
  decision: EvaluationDecision;
  reasons: EvaluationReason[];
  evaluationId: string | null;
  appliedRuleSetMeta?: {
    ruleSetId: string;
    ruleSetName: string;
    enforcementMode: string;
  };
}

export interface EvaluateParams {
  organizationId: string;
  workspaceId: string;
  entityType: GovernanceEntityType;
  entityId: string;
  transitionType: TransitionType;
  fromValue: string | null;
  toValue: string | null;
  entity: Record<string, any>;
  actor: {
    userId: string;
    platformRole: string;
    workspaceRole?: string;
  };
  projectId?: string;
  templateId?: string;
  relatedEntities?: Record<string, any[]>;
  requestId?: string;
  overrideReason?: string;
}

@Injectable()
export class GovernanceRuleEngineService {
  private readonly logger = new Logger(GovernanceRuleEngineService.name);

  constructor(
    private readonly resolver: GovernanceRuleResolverService,
    @InjectRepository(GovernanceEvaluation)
    private readonly evaluationRepo: Repository<GovernanceEvaluation>,
  ) {}

  /**
   * Evaluate governance rules for a transition.
   * Returns ALLOW if no rules match or all pass.
   * Returns WARN/BLOCK based on enforcement mode if any fail.
   */
  async evaluate(params: EvaluateParams): Promise<EvaluationResult> {
    const resolved = await this.resolver.resolve({
      organizationId: params.organizationId,
      workspaceId: params.workspaceId,
      projectId: params.projectId,
      templateId: params.templateId,
      entityType: params.entityType,
    });

    // No rules = ALLOW with no audit
    if (resolved.rules.length === 0) {
      return { decision: EvaluationDecision.ALLOW, reasons: [], evaluationId: null };
    }

    // Filter rules that match the transition (when clause)
    const applicableRules = resolved.rules.filter((rule) =>
      this.matchesTransition(rule, params.fromValue, params.toValue),
    );

    if (applicableRules.length === 0) {
      return { decision: EvaluationDecision.ALLOW, reasons: [], evaluationId: null };
    }

    // Build condition context
    const ctx: ConditionContext = {
      entity: params.entity,
      actor: params.actor,
      relatedEntities: params.relatedEntities,
    };

    // Evaluate all applicable rules
    const allReasons: EvaluationReason[] = [];
    let highestEnforcement = EnforcementMode.OFF;

    for (const rule of applicableRules) {
      const conditionResults = evaluateAllConditions(
        rule.ruleDefinition.conditions,
        ctx,
      );

      const failures = conditionResults.filter((r) => !r.passed);
      if (failures.length > 0) {
        for (const failure of failures) {
          allReasons.push({
            code: rule.code,
            message:
              failure.message ?? rule.ruleDefinition.message,
            failedCondition: failure.conditionType,
            ruleId: rule.ruleId,
            ruleVersion: rule.version,
          });
        }

        const ruleEnforcement = rule.enforcementMode as EnforcementMode;
        if (this.enforcementPrecedence(ruleEnforcement) >
            this.enforcementPrecedence(highestEnforcement)) {
          highestEnforcement = ruleEnforcement;
        }
      }
    }

    // Determine decision
    let decision: EvaluationDecision;
    if (allReasons.length === 0) {
      decision = EvaluationDecision.ALLOW;
    } else if (highestEnforcement === EnforcementMode.OFF) {
      decision = EvaluationDecision.ALLOW;
    } else if (highestEnforcement === EnforcementMode.WARN) {
      decision = EvaluationDecision.WARN;
    } else if (
      highestEnforcement === EnforcementMode.ADMIN_OVERRIDE &&
      params.overrideReason &&
      this.canOverride(params.actor)
    ) {
      decision = EvaluationDecision.OVERRIDE;
    } else {
      decision = EvaluationDecision.BLOCK;
    }

    // Build minimal snapshot from condition-referenced fields only (16 KB cap)
    const requiredFields = extractRequiredFields(applicableRules);
    const inputsSnapshot = buildInputsSnapshot({
      entityId: params.entityId,
      entityType: params.entityType,
      fromValue: params.fromValue,
      toValue: params.toValue,
      entity: params.entity,
      actor: params.actor,
      requiredFields,
    });
    const inputsHash = computeInputsHash(inputsSnapshot);

    // Persist evaluation (append-only audit)
    const primaryRule = applicableRules[0];
    const evaluation = this.evaluationRepo.create({
      organizationId: params.organizationId,
      workspaceId: params.workspaceId,
      entityType: params.entityType,
      entityId: params.entityId,
      transitionType: params.transitionType,
      fromValue: params.fromValue,
      toValue: params.toValue,
      ruleSetId: primaryRule?.ruleSetId ?? null,
      ruleId: primaryRule?.ruleId ?? null,
      ruleVersion: primaryRule?.version ?? null,
      enforcementMode: highestEnforcement,
      decision,
      reasons: allReasons,
      inputsHash,
      inputsSnapshot,
      actorUserId: params.actor.userId,
      requestId: params.requestId ?? null,
    });

    const saved = await this.evaluationRepo.save(evaluation);

    return {
      decision,
      reasons: allReasons,
      evaluationId: saved.id,
      appliedRuleSetMeta: primaryRule
        ? {
            ruleSetId: primaryRule.ruleSetId,
            ruleSetName: primaryRule.ruleSetName,
            enforcementMode: primaryRule.enforcementMode,
          }
        : undefined,
    };
  }

  /**
   * Convenience method for task status transitions.
   */
  async evaluateTaskStatusChange(params: {
    organizationId: string;
    workspaceId: string;
    taskId: string;
    fromStatus: string;
    toStatus: string;
    task: Record<string, any>;
    actor: { userId: string; platformRole: string; workspaceRole?: string };
    projectId?: string;
    requestId?: string;
    overrideReason?: string;
  }): Promise<EvaluationResult> {
    return this.evaluate({
      organizationId: params.organizationId,
      workspaceId: params.workspaceId,
      entityType: GovernanceEntityType.TASK,
      entityId: params.taskId,
      transitionType: TransitionType.STATUS_CHANGE,
      fromValue: params.fromStatus,
      toValue: params.toStatus,
      entity: params.task,
      actor: params.actor,
      projectId: params.projectId,
      requestId: params.requestId,
      overrideReason: params.overrideReason,
    });
  }

  /**
   * Convenience method for change request status transitions.
   */
  async evaluateChangeRequestStatusChange(params: {
    organizationId: string;
    workspaceId: string;
    crId: string;
    fromStatus: string;
    toStatus: string;
    changeRequest: Record<string, any>;
    actor: { userId: string; platformRole: string; workspaceRole?: string };
    relatedEntities?: Record<string, any[]>;
    requestId?: string;
    overrideReason?: string;
  }): Promise<EvaluationResult> {
    return this.evaluate({
      organizationId: params.organizationId,
      workspaceId: params.workspaceId,
      entityType: GovernanceEntityType.CHANGE_REQUEST,
      entityId: params.crId,
      transitionType: TransitionType.STATUS_CHANGE,
      fromValue: params.fromStatus,
      toValue: params.toStatus,
      entity: params.changeRequest,
      actor: params.actor,
      relatedEntities: params.relatedEntities,
      requestId: params.requestId,
      overrideReason: params.overrideReason,
    });
  }

  /**
   * Convenience method for phase gate transitions.
   */
  async evaluatePhaseGateTransition(params: {
    organizationId: string;
    workspaceId: string;
    gateId: string;
    fromStatus: string;
    toStatus: string;
    gate: Record<string, any>;
    actor: { userId: string; platformRole: string; workspaceRole?: string };
    projectId?: string;
    relatedEntities?: Record<string, any[]>;
    requestId?: string;
    overrideReason?: string;
  }): Promise<EvaluationResult> {
    return this.evaluate({
      organizationId: params.organizationId,
      workspaceId: params.workspaceId,
      entityType: GovernanceEntityType.PHASE_GATE,
      entityId: params.gateId,
      transitionType: TransitionType.GATE_DECISION,
      fromValue: params.fromStatus,
      toValue: params.toStatus,
      entity: params.gate,
      actor: params.actor,
      projectId: params.projectId,
      relatedEntities: params.relatedEntities,
      requestId: params.requestId,
      overrideReason: params.overrideReason,
    });
  }

  private matchesTransition(
    rule: ResolvedRule,
    fromValue: string | null,
    toValue: string | null,
  ): boolean {
    const when = rule.ruleDefinition.when;
    if (!when) return true;
    if (when.fromStatus && when.fromStatus !== fromValue) return false;
    if (when.toStatus && when.toStatus !== toValue) return false;
    return true;
  }

  private enforcementPrecedence(mode: EnforcementMode): number {
    switch (mode) {
      case EnforcementMode.OFF:
        return 0;
      case EnforcementMode.WARN:
        return 1;
      case EnforcementMode.ADMIN_OVERRIDE:
        return 2;
      case EnforcementMode.BLOCK:
        return 3;
      default:
        return 0;
    }
  }

  private canOverride(actor: {
    platformRole: string;
    workspaceRole?: string;
  }): boolean {
    return (
      actor.platformRole === 'ADMIN' ||
      actor.workspaceRole === 'OWNER' ||
      actor.workspaceRole === 'ADMIN'
    );
  }
}
