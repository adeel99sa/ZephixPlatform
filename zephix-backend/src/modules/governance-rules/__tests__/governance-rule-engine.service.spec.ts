import { GovernanceRuleEngineService } from '../services/governance-rule-engine.service';
import { GovernanceRuleResolverService, ResolvedRuleSet } from '../services/governance-rule-resolver.service';
import { GovernanceEntityType, ScopeType, EnforcementMode } from '../entities/governance-rule-set.entity';
import { ConditionType, ConditionSeverity } from '../entities/governance-rule.entity';
import { EvaluationDecision, TransitionType } from '../entities/governance-evaluation.entity';

describe('GovernanceRuleEngineService', () => {
  let service: GovernanceRuleEngineService;
  let mockResolver: jest.Mocked<GovernanceRuleResolverService>;
  let mockEvalRepo: any;

  beforeEach(() => {
    mockResolver = {
      resolve: jest.fn(),
    } as any;

    mockEvalRepo = {
      create: jest.fn((data) => ({ id: 'eval-1', ...data })),
      save: jest.fn((data) => Promise.resolve({ id: 'eval-1', ...data })),
    };

    service = new GovernanceRuleEngineService(mockResolver, mockEvalRepo);
  });

  it('returns ALLOW when no rules match', async () => {
    mockResolver.resolve.mockResolvedValue({
      entityType: GovernanceEntityType.TASK,
      rules: [],
    });

    const result = await service.evaluate({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      entityType: GovernanceEntityType.TASK,
      entityId: 'task-1',
      transitionType: TransitionType.STATUS_CHANGE,
      fromValue: 'IN_PROGRESS',
      toValue: 'DONE',
      entity: { assigneeUserId: 'user-1' },
      actor: { userId: 'actor-1', platformRole: 'MEMBER' },
    });

    expect(result.decision).toBe(EvaluationDecision.ALLOW);
    expect(result.reasons).toHaveLength(0);
    expect(result.evaluationId).toBeNull();
  });

  it('returns BLOCK when rule fails and enforcement is BLOCK', async () => {
    mockResolver.resolve.mockResolvedValue({
      entityType: GovernanceEntityType.TASK,
      rules: [
        {
          ruleSetId: 'rs-1',
          ruleSetName: 'Task Guards',
          enforcementMode: EnforcementMode.BLOCK,
          scopeType: ScopeType.SYSTEM,
          ruleId: 'rule-1',
          code: 'TASK_DONE_REQUIRES_ASSIGNEE',
          version: 1,
          ruleDefinition: {
            when: { toStatus: 'DONE' },
            conditions: [
              { type: ConditionType.REQUIRED_FIELD, field: 'assigneeUserId' },
            ],
            message: 'Assignee required',
            severity: ConditionSeverity.ERROR,
          },
        },
      ],
    });

    const result = await service.evaluate({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      entityType: GovernanceEntityType.TASK,
      entityId: 'task-1',
      transitionType: TransitionType.STATUS_CHANGE,
      fromValue: 'IN_PROGRESS',
      toValue: 'DONE',
      entity: { assigneeUserId: null },
      actor: { userId: 'actor-1', platformRole: 'MEMBER' },
    });

    expect(result.decision).toBe(EvaluationDecision.BLOCK);
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0].code).toBe('TASK_DONE_REQUIRES_ASSIGNEE');
    expect(result.evaluationId).toBe('eval-1');
    expect(mockEvalRepo.save).toHaveBeenCalled();
  });

  it('returns WARN when rule fails and enforcement is WARN', async () => {
    mockResolver.resolve.mockResolvedValue({
      entityType: GovernanceEntityType.TASK,
      rules: [
        {
          ruleSetId: 'rs-1',
          ruleSetName: 'Task Guards',
          enforcementMode: EnforcementMode.WARN,
          scopeType: ScopeType.SYSTEM,
          ruleId: 'rule-1',
          code: 'TASK_DONE_ZERO_REMAINING',
          version: 1,
          ruleDefinition: {
            when: { toStatus: 'DONE' },
            conditions: [
              { type: ConditionType.NUMBER_LTE, field: 'remainingEstimate', value: 0 },
            ],
            message: 'Remaining must be 0',
            severity: ConditionSeverity.WARNING,
          },
        },
      ],
    });

    const result = await service.evaluate({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      entityType: GovernanceEntityType.TASK,
      entityId: 'task-1',
      transitionType: TransitionType.STATUS_CHANGE,
      fromValue: 'IN_PROGRESS',
      toValue: 'DONE',
      entity: { remainingEstimate: 5 },
      actor: { userId: 'actor-1', platformRole: 'MEMBER' },
    });

    expect(result.decision).toBe(EvaluationDecision.WARN);
    expect(result.reasons).toHaveLength(1);
  });

  it('returns ALLOW when all conditions pass', async () => {
    mockResolver.resolve.mockResolvedValue({
      entityType: GovernanceEntityType.TASK,
      rules: [
        {
          ruleSetId: 'rs-1',
          ruleSetName: 'Task Guards',
          enforcementMode: EnforcementMode.BLOCK,
          scopeType: ScopeType.SYSTEM,
          ruleId: 'rule-1',
          code: 'TASK_DONE_REQUIRES_ASSIGNEE',
          version: 1,
          ruleDefinition: {
            when: { toStatus: 'DONE' },
            conditions: [
              { type: ConditionType.REQUIRED_FIELD, field: 'assigneeUserId' },
            ],
            message: 'Assignee required',
            severity: ConditionSeverity.ERROR,
          },
        },
      ],
    });

    const result = await service.evaluate({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      entityType: GovernanceEntityType.TASK,
      entityId: 'task-1',
      transitionType: TransitionType.STATUS_CHANGE,
      fromValue: 'IN_PROGRESS',
      toValue: 'DONE',
      entity: { assigneeUserId: 'user-1' },
      actor: { userId: 'actor-1', platformRole: 'MEMBER' },
    });

    expect(result.decision).toBe(EvaluationDecision.ALLOW);
    expect(result.reasons).toHaveLength(0);
  });

  it('skips rules that do not match transition when clause', async () => {
    mockResolver.resolve.mockResolvedValue({
      entityType: GovernanceEntityType.TASK,
      rules: [
        {
          ruleSetId: 'rs-1',
          ruleSetName: 'Task Guards',
          enforcementMode: EnforcementMode.BLOCK,
          scopeType: ScopeType.SYSTEM,
          ruleId: 'rule-1',
          code: 'TASK_DONE_REQUIRES_ASSIGNEE',
          version: 1,
          ruleDefinition: {
            when: { toStatus: 'DONE' },
            conditions: [
              { type: ConditionType.REQUIRED_FIELD, field: 'assigneeUserId' },
            ],
            message: 'Assignee required',
            severity: ConditionSeverity.ERROR,
          },
        },
      ],
    });

    const result = await service.evaluate({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      entityType: GovernanceEntityType.TASK,
      entityId: 'task-1',
      transitionType: TransitionType.STATUS_CHANGE,
      fromValue: 'TODO',
      toValue: 'IN_PROGRESS',
      entity: { assigneeUserId: null },
      actor: { userId: 'actor-1', platformRole: 'MEMBER' },
    });

    expect(result.decision).toBe(EvaluationDecision.ALLOW);
  });

  it('returns OVERRIDE when ADMIN_OVERRIDE and actor can override', async () => {
    mockResolver.resolve.mockResolvedValue({
      entityType: GovernanceEntityType.TASK,
      rules: [
        {
          ruleSetId: 'rs-1',
          ruleSetName: 'Task Guards',
          enforcementMode: EnforcementMode.ADMIN_OVERRIDE,
          scopeType: ScopeType.SYSTEM,
          ruleId: 'rule-1',
          code: 'TASK_DONE_REQUIRES_ASSIGNEE',
          version: 1,
          ruleDefinition: {
            when: { toStatus: 'DONE' },
            conditions: [
              { type: ConditionType.REQUIRED_FIELD, field: 'assigneeUserId' },
            ],
            message: 'Assignee required',
            severity: ConditionSeverity.ERROR,
          },
        },
      ],
    });

    const result = await service.evaluate({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      entityType: GovernanceEntityType.TASK,
      entityId: 'task-1',
      transitionType: TransitionType.STATUS_CHANGE,
      fromValue: 'IN_PROGRESS',
      toValue: 'DONE',
      entity: { assigneeUserId: null },
      actor: { userId: 'actor-1', platformRole: 'ADMIN' },
      overrideReason: 'Emergency fix',
    });

    expect(result.decision).toBe(EvaluationDecision.OVERRIDE);
  });

  it('returns BLOCK when ADMIN_OVERRIDE but actor is MEMBER', async () => {
    mockResolver.resolve.mockResolvedValue({
      entityType: GovernanceEntityType.TASK,
      rules: [
        {
          ruleSetId: 'rs-1',
          ruleSetName: 'Task Guards',
          enforcementMode: EnforcementMode.ADMIN_OVERRIDE,
          scopeType: ScopeType.SYSTEM,
          ruleId: 'rule-1',
          code: 'TASK_DONE_REQUIRES_ASSIGNEE',
          version: 1,
          ruleDefinition: {
            when: { toStatus: 'DONE' },
            conditions: [
              { type: ConditionType.REQUIRED_FIELD, field: 'assigneeUserId' },
            ],
            message: 'Assignee required',
            severity: ConditionSeverity.ERROR,
          },
        },
      ],
    });

    const result = await service.evaluate({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      entityType: GovernanceEntityType.TASK,
      entityId: 'task-1',
      transitionType: TransitionType.STATUS_CHANGE,
      fromValue: 'IN_PROGRESS',
      toValue: 'DONE',
      entity: { assigneeUserId: null },
      actor: { userId: 'actor-1', platformRole: 'MEMBER' },
      overrideReason: 'Trying to override',
    });

    expect(result.decision).toBe(EvaluationDecision.BLOCK);
  });

  it('always persists evaluation record when rules match', async () => {
    mockResolver.resolve.mockResolvedValue({
      entityType: GovernanceEntityType.TASK,
      rules: [
        {
          ruleSetId: 'rs-1',
          ruleSetName: 'Test',
          enforcementMode: EnforcementMode.BLOCK,
          scopeType: ScopeType.SYSTEM,
          ruleId: 'rule-1',
          code: 'TEST',
          version: 1,
          ruleDefinition: {
            when: { toStatus: 'DONE' },
            conditions: [
              { type: ConditionType.REQUIRED_FIELD, field: 'assigneeUserId' },
            ],
            message: 'Test',
            severity: ConditionSeverity.ERROR,
          },
        },
      ],
    });

    await service.evaluate({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      entityType: GovernanceEntityType.TASK,
      entityId: 'task-1',
      transitionType: TransitionType.STATUS_CHANGE,
      fromValue: 'IN_PROGRESS',
      toValue: 'DONE',
      entity: { assigneeUserId: 'user-1' },
      actor: { userId: 'actor-1', platformRole: 'MEMBER' },
    });

    expect(mockEvalRepo.create).toHaveBeenCalled();
    expect(mockEvalRepo.save).toHaveBeenCalled();
    const createArg = mockEvalRepo.create.mock.calls[0][0];
    expect(createArg.inputsHash).toBeDefined();
    expect(createArg.inputsHash).toHaveLength(16);
  });

  describe('evaluateTaskStatusChange convenience method', () => {
    it('delegates to evaluate with correct params', async () => {
      mockResolver.resolve.mockResolvedValue({
        entityType: GovernanceEntityType.TASK,
        rules: [],
      });

      const result = await service.evaluateTaskStatusChange({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        taskId: 'task-1',
        fromStatus: 'TODO',
        toStatus: 'IN_PROGRESS',
        task: { id: 'task-1' },
        actor: { userId: 'actor-1', platformRole: 'MEMBER' },
      });

      expect(result.decision).toBe(EvaluationDecision.ALLOW);
      expect(mockResolver.resolve).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: GovernanceEntityType.TASK,
        }),
      );
    });
  });
});
