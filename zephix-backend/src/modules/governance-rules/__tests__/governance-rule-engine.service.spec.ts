import { GovernanceRuleEngineService } from '../services/governance-rule-engine.service';
import { GovernanceRuleResolverService } from '../services/governance-rule-resolver.service';
import { GovernanceEntityType, ScopeType, EnforcementMode } from '../entities/governance-rule-set.entity';
import { ConditionType, ConditionSeverity } from '../entities/governance-rule.entity';
import { EvaluationDecision, TransitionType } from '../entities/governance-evaluation.entity';

describe('GovernanceRuleEngineService', () => {
  let service: GovernanceRuleEngineService;
  let mockResolver: jest.Mocked<GovernanceRuleResolverService>;
  let mockEvalRepo: any;
  let mockExceptionRepo: { createQueryBuilder: jest.Mock; save: jest.Mock };
  let mockExceptionQb: {
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    getOne: jest.Mock;
  };

  beforeEach(() => {
    mockResolver = {
      resolve: jest.fn(),
    } as any;

    mockEvalRepo = {
      create: jest.fn((data) => ({ id: 'eval-1', ...data })),
      save: jest.fn((data) => Promise.resolve({ id: 'eval-1', ...data })),
    };

    mockExceptionQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    mockExceptionRepo = {
      createQueryBuilder: jest.fn(() => mockExceptionQb),
      save: jest.fn().mockResolvedValue({}),
    };

    service = new GovernanceRuleEngineService(mockResolver, mockEvalRepo, mockExceptionRepo as any);
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

  it('returns OVERRIDE when APPROVED governance exception matches task transition', async () => {
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

    const approvedEx = {
      id: 'ex-approved-1',
      organizationId: 'org-1',
      projectId: 'proj-1',
      status: 'APPROVED',
      exceptionType: 'GOVERNANCE_RULE',
      metadata: {
        taskId: 'task-1',
        toStatus: 'DONE',
        policyCodes: ['TASK_DONE_REQUIRES_ASSIGNEE'],
      },
    };
    mockExceptionQb.getOne.mockResolvedValueOnce(approvedEx);

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
      projectId: 'proj-1',
    });

    expect(result.decision).toBe(EvaluationDecision.OVERRIDE);
    expect(result.reasons.some((r) => r.code === 'GOVERNANCE_EXCEPTION_BYPASS')).toBe(true);
    expect(mockExceptionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ex-approved-1', status: 'CONSUMED' }),
    );
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

  describe('when.creationOnly', () => {
    const creationOnlyAdminRule = {
      ruleSetId: 'rs-1',
      ruleSetName: 'Scope',
      enforcementMode: EnforcementMode.BLOCK,
      scopeType: ScopeType.SYSTEM,
      ruleId: 'rule-scope',
      code: 'scope-change-control',
      version: 1,
      ruleDefinition: {
        when: { creationOnly: true },
        conditions: [
          { type: ConditionType.ROLE_ALLOWED, params: { roles: ['ADMIN'] } },
        ],
        message: 'Admins only',
        severity: ConditionSeverity.ERROR,
      },
    };

    it('applies on task creation (fromValue null) and blocks non-admin', async () => {
      mockResolver.resolve.mockResolvedValue({
        entityType: GovernanceEntityType.TASK,
        rules: [creationOnlyAdminRule],
      });

      const result = await service.evaluateTaskStatusChange({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        taskId: 'task-new',
        fromStatus: null,
        toStatus: 'TODO',
        task: { id: 'task-new', title: 'T' },
        actor: { userId: 'actor-1', platformRole: 'MEMBER' },
      });

      expect(result.decision).toBe(EvaluationDecision.BLOCK);
      expect(result.reasons[0].code).toBe('scope-change-control');
    });

    it('allows task creation for platform admin when creationOnly rule passes', async () => {
      mockResolver.resolve.mockResolvedValue({
        entityType: GovernanceEntityType.TASK,
        rules: [creationOnlyAdminRule],
      });

      const result = await service.evaluateTaskStatusChange({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        taskId: 'task-new',
        fromStatus: null,
        toStatus: 'TODO',
        task: { id: 'task-new', title: 'T' },
        actor: { userId: 'admin-1', platformRole: 'ADMIN' },
      });

      expect(result.decision).toBe(EvaluationDecision.ALLOW);
    });

    it('does not apply creationOnly rule on status updates', async () => {
      mockResolver.resolve.mockResolvedValue({
        entityType: GovernanceEntityType.TASK,
        rules: [creationOnlyAdminRule],
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
      expect(mockEvalRepo.save).not.toHaveBeenCalled();
    });
  });
});
