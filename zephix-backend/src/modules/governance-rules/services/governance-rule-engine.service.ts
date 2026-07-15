import { Injectable, Logger, BadRequestException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GovernanceException } from '../../governance-exceptions/entities/governance-exception.entity';
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
import { isPolicyEvaluable } from '../constants/policy-bundle.constants';
import { extractRequiredFields, buildInputsSnapshot } from '../engine/snapshot-builder';

export interface EvaluationResult {
  decision: EvaluationDecision;
  reasons: EvaluationReason[];
  evaluationId: string | null;
  /**
   * SKIP-1: machine token present only when decision === SKIPPED. Null on every
   * other outcome. Lets callers/log lines see WHY a rule didn't run.
   */
  skipReason?: string | null;
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
    @Optional()
    @InjectRepository(GovernanceException)
    private readonly governanceExceptionRepo?: Repository<GovernanceException>,
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

    // No rules resolved. Two cases, distinguished by the resolver's skip signal:
    //  - NO_ACTIVE_VERSION (SKIP-1 path 2): active rule set(s) with no version
    //    pointer — a data-integrity defect. Write a SKIPPED receipt + WARN.
    //  - otherwise: nothing configured — a legitimate no-op ALLOW (nothing to
    //    skip, so no receipt).
    if (resolved.rules.length === 0) {
      if (resolved.skip?.reason === 'NO_ACTIVE_VERSION') {
        this.logger.warn(
          `Governance SKIPPED (NO_ACTIVE_VERSION): active rule set(s) ` +
            `[${resolved.skip.ruleSetIds.join(', ')}] have no active-version ` +
            `pointer — data-integrity defect, not a config choice. ` +
            `org=${params.organizationId} ws=${params.workspaceId} ` +
            `entity=${params.entityType}:${params.entityId}`,
        );
        return this.persistSkip(
          params,
          'NO_ACTIVE_VERSION',
          [
            {
              code: 'GOVERNANCE',
              message:
                'Rule set active but has no active-version pointer; no rule could be evaluated.',
            },
          ],
          { ruleSetId: resolved.skip.ruleSetIds[0] ?? null },
        );
      }
      return {
        decision: EvaluationDecision.ALLOW,
        reasons: [],
        evaluationId: null,
        skipReason: null,
      };
    }

    // Rules that match this transition's when-clause (a rule that doesn't match
    // is legitimately non-applicable — NOT a skip, no receipt).
    const transitionMatched = resolved.rules.filter((rule) =>
      this.matchesTransition(rule, params.fromValue, params.toValue),
    );

    // GOV-FIX-B1 (1.0) + SKIP-1 (paths 1/6): among the rules that WOULD apply to
    // this transition, split evaluable from non-evaluable. A non-evaluable rule
    // (input data never injected — returns when E7/E14 ship) must not run, but
    // its skip is now a first-class receipt, not a silent ALLOW.
    const nonEvaluableSkipped = transitionMatched.filter(
      (rule) => !isPolicyEvaluable(rule.code),
    );
    const applicableRules = transitionMatched.filter((rule) =>
      isPolicyEvaluable(rule.code),
    );

    if (applicableRules.length === 0) {
      if (nonEvaluableSkipped.length > 0) {
        // Exactly ONE receipt per transition even if several non-evaluable rules
        // matched — skipReason lists every code.
        const codes = [...new Set(nonEvaluableSkipped.map((r) => r.code))];
        const primary = nonEvaluableSkipped[0];
        return this.persistSkip(
          params,
          `NON_EVALUABLE:${codes.join(',')}`,
          codes.map((code) => ({
            code,
            message: `Policy '${code}' skipped: no data source (non-evaluable until E7/E14).`,
          })),
          {
            ruleSetId: primary.ruleSetId,
            ruleId: primary.ruleId,
            ruleVersion: primary.version,
            enforcementMode: primary.enforcementMode,
          },
        );
      }
      return {
        decision: EvaluationDecision.ALLOW,
        reasons: [],
        evaluationId: null,
        skipReason: null,
      };
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

    let consumedBypassException: GovernanceException | null = null;
    if (
      decision === EvaluationDecision.BLOCK &&
      params.entityType === GovernanceEntityType.TASK &&
      params.transitionType === TransitionType.STATUS_CHANGE &&
      this.governanceExceptionRepo &&
      params.toValue
    ) {
      const blockingPolicyCodes = [
        ...new Set(allReasons.map((r) => r.code).filter((c): c is string => Boolean(c))),
      ];
      consumedBypassException = await this.findApprovedGovernanceBypass({
        organizationId: params.organizationId,
        projectId: params.projectId,
        taskId: params.entityId,
        toStatus: params.toValue,
        blockingPolicyCodes,
      });
      if (consumedBypassException) {
        decision = EvaluationDecision.OVERRIDE;
        allReasons.push({
          code: 'GOVERNANCE_EXCEPTION_BYPASS',
          message: `Action permitted by approved exception ${consumedBypassException.id}`,
        });
      }
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

    if (consumedBypassException && this.governanceExceptionRepo) {
      try {
        consumedBypassException.status = 'CONSUMED';
        consumedBypassException.metadata = {
          ...(consumedBypassException.metadata || {}),
          consumedAt: new Date().toISOString(),
          consumedByEvaluationId: saved.id,
        };
        await this.governanceExceptionRepo.save(consumedBypassException);
      } catch (err) {
        this.logger.error(
          `Failed to mark governance exception ${consumedBypassException.id} as CONSUMED`,
          err instanceof Error ? err.stack : undefined,
        );
      }
    }

    return {
      decision,
      reasons: allReasons,
      evaluationId: saved.id,
      skipReason: null,
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
   * SKIP-1: persist a SKIPPED receipt for a rule that WOULD have applied to this
   * transition but did not run. A skip is a first-class outcome — this writes a
   * real governance_evaluations row (decision=SKIPPED, structured skipReason,
   * actor = the transitioning user), replacing the old silent ALLOW/null. No
   * inputs hash/snapshot: nothing was evaluated, so there is nothing to hash.
   * Returns SKIPPED, which callers treat like ALLOW (the transition proceeds).
   */
  private async persistSkip(
    params: EvaluateParams,
    skipReason: string,
    reasons: EvaluationReason[],
    ruleMeta?: {
      ruleSetId?: string | null;
      ruleId?: string | null;
      ruleVersion?: number | null;
      enforcementMode?: string | null;
    },
  ): Promise<EvaluationResult> {
    const evaluation = this.evaluationRepo.create({
      organizationId: params.organizationId,
      workspaceId: params.workspaceId,
      entityType: params.entityType,
      entityId: params.entityId,
      transitionType: params.transitionType,
      fromValue: params.fromValue,
      toValue: params.toValue,
      ruleSetId: ruleMeta?.ruleSetId ?? null,
      ruleId: ruleMeta?.ruleId ?? null,
      ruleVersion: ruleMeta?.ruleVersion ?? null,
      enforcementMode: ruleMeta?.enforcementMode ?? EnforcementMode.OFF,
      decision: EvaluationDecision.SKIPPED,
      skipReason,
      reasons,
      inputsHash: null,
      inputsSnapshot: null,
      actorUserId: params.actor.userId,
      requestId: params.requestId ?? null,
    });
    const saved = await this.evaluationRepo.save(evaluation);
    return {
      decision: EvaluationDecision.SKIPPED,
      reasons,
      evaluationId: saved.id,
      skipReason,
    };
  }

  /**
   * Convenience method for task status transitions.
   */
  async evaluateTaskStatusChange(params: {
    organizationId: string;
    workspaceId: string;
    taskId: string;
    /** Null when evaluating task creation (no prior persisted status). */
    fromStatus: string | null;
    toStatus: string;
    task: Record<string, any>;
    actor: { userId: string; platformRole: string; workspaceRole?: string };
    projectId?: string;
    /** When set, TEMPLATE-scoped governance rules for this template are merged by the resolver. */
    templateId?: string;
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
      templateId: params.templateId,
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

  /**
   * Approved GOVERNANCE_RULE exception for the same task + target status (+ policy codes).
   * Single indexed query (org + status + type + JSONB keys).
   */
  private async findApprovedGovernanceBypass(params: {
    organizationId: string;
    projectId?: string;
    taskId: string;
    toStatus: string;
    blockingPolicyCodes: string[];
  }): Promise<GovernanceException | null> {
    const repo = this.governanceExceptionRepo;
    if (!repo) return null;
    if (!params.blockingPolicyCodes.length) return null;

    const qb = repo
      .createQueryBuilder('e')
      .where('e.organization_id = :organizationId', {
        organizationId: params.organizationId,
      })
      .andWhere('e.status = :status', { status: 'APPROVED' })
      .andWhere('e.exception_type = :type', { type: 'GOVERNANCE_RULE' })
      .andWhere("e.metadata->>'taskId' = :taskId", { taskId: params.taskId })
      .andWhere("e.metadata->>'toStatus' = :toStatus", { toStatus: params.toStatus })
      .orderBy('e.updated_at', 'DESC');

    if (params.projectId) {
      qb.andWhere('e.project_id = :projectId', { projectId: params.projectId });
    } else {
      qb.andWhere('e.project_id IS NULL');
    }

    const row = await qb.getOne();
    if (!row) return null;

    if (!this.metadataPolicyCodesMatch(row.metadata?.policyCodes, params.blockingPolicyCodes)) {
      return null;
    }

    return row;
  }

  /**
   * Every blocking policy code must appear on the approved exception metadata.policyCodes.
   * If policyCodes was omitted (legacy rows), allow match on task + status only.
   */
  private metadataPolicyCodesMatch(
    metaCodes: unknown,
    blocking: string[],
  ): boolean {
    const uniq = [...new Set(blocking.filter(Boolean))];
    if (!uniq.length) return false;
    if (!Array.isArray(metaCodes) || metaCodes.length === 0) {
      return true;
    }
    const allowed = new Set(metaCodes.map((c) => String(c)));
    return uniq.every((c) => allowed.has(c));
  }

  private matchesTransition(
    rule: ResolvedRule,
    fromValue: string | null,
    toValue: string | null,
  ): boolean {
    const when = rule.ruleDefinition.when;
    if (!when) return true;
    if (when.creationOnly === true && fromValue !== null) return false;
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
