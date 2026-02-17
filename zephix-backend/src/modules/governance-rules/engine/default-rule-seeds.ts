import {
  ScopeType,
  GovernanceEntityType,
  EnforcementMode,
} from '../entities/governance-rule-set.entity';
import {
  ConditionType,
  ConditionSeverity,
  RuleDefinition,
} from '../entities/governance-rule.entity';

export interface RuleSetSeed {
  name: string;
  scopeType: ScopeType;
  entityType: GovernanceEntityType;
  enforcementMode: EnforcementMode;
  description: string;
  rules: Array<{
    code: string;
    ruleDefinition: RuleDefinition;
  }>;
}

/**
 * System-level default rules shipped OFF.
 * Customers opt into enforcement at org/workspace/project level.
 */
export const SYSTEM_RULE_SEEDS: RuleSetSeed[] = [
  // --- Pack 1: Task Status Transitions ---
  {
    name: 'Task Completion Guards',
    scopeType: ScopeType.SYSTEM,
    entityType: GovernanceEntityType.TASK,
    enforcementMode: EnforcementMode.OFF,
    description:
      'Guards that prevent tasks from moving to Done without meeting quality criteria',
    rules: [
      {
        code: 'TASK_DONE_REQUIRES_ASSIGNEE',
        ruleDefinition: {
          when: { toStatus: 'DONE' },
          conditions: [
            {
              type: ConditionType.REQUIRED_FIELD,
              field: 'assigneeUserId',
            },
          ],
          message: 'Task must have an assignee before marking as Done',
          severity: ConditionSeverity.ERROR,
        },
      },
      {
        code: 'TASK_DONE_REQUIRES_AC',
        ruleDefinition: {
          when: { toStatus: 'DONE' },
          conditions: [
            {
              type: ConditionType.FIELD_NOT_EMPTY,
              field: 'acceptanceCriteria',
            },
          ],
          message:
            'Task must have acceptance criteria filled before marking as Done',
          severity: ConditionSeverity.ERROR,
        },
      },
      {
        code: 'TASK_DONE_ZERO_REMAINING',
        ruleDefinition: {
          when: { toStatus: 'DONE' },
          conditions: [
            {
              type: ConditionType.NUMBER_LTE,
              field: 'remainingEstimate',
              value: 0,
            },
          ],
          message:
            'Remaining estimate must be 0 before marking task as Done',
          severity: ConditionSeverity.WARNING,
        },
      },
      {
        code: 'TASK_IN_PROGRESS_REQUIRES_START_DATE',
        ruleDefinition: {
          when: { toStatus: 'IN_PROGRESS' },
          conditions: [
            {
              type: ConditionType.REQUIRED_FIELD,
              field: 'startDate',
            },
          ],
          message: 'Task must have a start date before moving to In Progress',
          severity: ConditionSeverity.WARNING,
        },
      },
    ],
  },

  // --- Pack 2: Change Request Transitions ---
  {
    name: 'Change Request Approval Guards',
    scopeType: ScopeType.SYSTEM,
    entityType: GovernanceEntityType.CHANGE_REQUEST,
    enforcementMode: EnforcementMode.OFF,
    description:
      'Guards that enforce approval chain completion before CR approval',
    rules: [
      {
        code: 'CR_APPROVED_REQUIRES_APPROVALS',
        ruleDefinition: {
          when: { toStatus: 'APPROVED' },
          conditions: [
            {
              type: ConditionType.APPROVALS_MET,
              params: { requiredCount: 1 },
            },
          ],
          message:
            'Change request requires at least 1 approval before it can be approved',
          severity: ConditionSeverity.ERROR,
        },
      },
      {
        code: 'CR_IMPLEMENTED_REQUIRES_PLAN',
        ruleDefinition: {
          when: { toStatus: 'IMPLEMENTED' },
          conditions: [
            {
              type: ConditionType.FIELD_NOT_EMPTY,
              field: 'implementationPlan',
            },
          ],
          message:
            'Change request must have an implementation plan before marking as Implemented',
          severity: ConditionSeverity.WARNING,
        },
      },
    ],
  },

  // --- Pack 3: Phase Gate Transitions ---
  {
    name: 'Phase Gate Guards',
    scopeType: ScopeType.SYSTEM,
    entityType: GovernanceEntityType.PHASE_GATE,
    enforcementMode: EnforcementMode.OFF,
    description:
      'Guards that enforce required gate passage before phase advancement',
    rules: [
      {
        code: 'GATE_REQUIRES_SUBMISSION_APPROVED',
        ruleDefinition: {
          when: { toStatus: 'APPROVED' },
          conditions: [
            {
              type: ConditionType.EXISTS_RELATED,
              relatedEntity: 'gateSubmissions',
              params: { minCount: 1, status: 'APPROVED' },
            },
          ],
          message:
            'Gate requires at least one approved submission before it can be passed',
          severity: ConditionSeverity.ERROR,
        },
      },
    ],
  },
];
