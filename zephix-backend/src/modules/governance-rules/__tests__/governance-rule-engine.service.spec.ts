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

  describe('SKIP-1 — SKIPPED receipts (paths 1/6 and 2)', () => {
    const nonEvaluableRule = (code: string) => ({
      ruleSetId: 'rs-ne',
      ruleSetName: 'Non-evaluable',
      enforcementMode: EnforcementMode.WARN,
      scopeType: ScopeType.SYSTEM,
      ruleId: `rule-${code}`,
      code,
      version: 1,
      ruleDefinition: {
        when: { toStatus: 'DONE' },
        conditions: [
          { type: ConditionType.REQUIRED_FIELD, field: 'whatever' },
        ],
        message: 'n/a',
        severity: ConditionSeverity.WARNING,
      },
    });

    it('non-evaluable rule matching the transition → exactly ONE SKIPPED row, actor = transitioning user', async () => {
      mockResolver.resolve.mockResolvedValue({
        entityType: GovernanceEntityType.TASK,
        rules: [nonEvaluableRule('risk-threshold-alert')],
      });

      const result = await service.evaluate({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        entityType: GovernanceEntityType.TASK,
        entityId: 'task-1',
        transitionType: TransitionType.STATUS_CHANGE,
        fromValue: 'IN_PROGRESS',
        toValue: 'DONE',
        entity: {},
        actor: { userId: 'actor-42', platformRole: 'MEMBER' },
      });

      expect(result.decision).toBe(EvaluationDecision.SKIPPED);
      expect(result.skipReason).toBe('NON_EVALUABLE:risk-threshold-alert');
      expect(result.evaluationId).toBe('eval-1');
      expect(mockEvalRepo.save).toHaveBeenCalledTimes(1);
      const row = mockEvalRepo.create.mock.calls[0][0];
      expect(row.decision).toBe(EvaluationDecision.SKIPPED);
      expect(row.skipReason).toBe('NON_EVALUABLE:risk-threshold-alert');
      expect(row.actorUserId).toBe('actor-42');
      expect(row.inputsHash).toBeNull();
    });

    it('multiple non-evaluable rules → still ONE row, skipReason lists all codes', async () => {
      mockResolver.resolve.mockResolvedValue({
        entityType: GovernanceEntityType.TASK,
        rules: [
          nonEvaluableRule('risk-threshold-alert'),
          nonEvaluableRule('resource-capacity-governance'),
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
        entity: {},
        actor: { userId: 'actor-1', platformRole: 'MEMBER' },
      });

      expect(result.decision).toBe(EvaluationDecision.SKIPPED);
      expect(result.skipReason).toBe(
        'NON_EVALUABLE:risk-threshold-alert,resource-capacity-governance',
      );
      expect(mockEvalRepo.save).toHaveBeenCalledTimes(1);
    });

    it('non-evaluable rule that does NOT match the transition → ALLOW, no receipt (not a skip)', async () => {
      mockResolver.resolve.mockResolvedValue({
        entityType: GovernanceEntityType.TASK,
        rules: [nonEvaluableRule('risk-threshold-alert')],
      });

      const result = await service.evaluate({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        entityType: GovernanceEntityType.TASK,
        entityId: 'task-1',
        transitionType: TransitionType.STATUS_CHANGE,
        fromValue: 'TODO',
        toValue: 'IN_PROGRESS', // rule's when.toStatus is DONE → no match
        entity: {},
        actor: { userId: 'actor-1', platformRole: 'MEMBER' },
      });

      expect(result.decision).toBe(EvaluationDecision.ALLOW);
      expect(result.evaluationId).toBeNull();
      expect(mockEvalRepo.save).not.toHaveBeenCalled();
    });

    it('resolver NO_ACTIVE_VERSION → SKIPPED row + WARN log (data-integrity defect)', async () => {
      const warnSpy = jest
        .spyOn((service as any).logger, 'warn')
        .mockImplementation(() => undefined);

      mockResolver.resolve.mockResolvedValue({
        entityType: GovernanceEntityType.TASK,
        rules: [],
        skip: { reason: 'NO_ACTIVE_VERSION', ruleSetIds: ['rs-broken'] },
      });

      const result = await service.evaluate({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        entityType: GovernanceEntityType.TASK,
        entityId: 'task-1',
        transitionType: TransitionType.STATUS_CHANGE,
        fromValue: 'IN_PROGRESS',
        toValue: 'DONE',
        entity: {},
        actor: { userId: 'actor-1', platformRole: 'MEMBER' },
      });

      expect(result.decision).toBe(EvaluationDecision.SKIPPED);
      expect(result.skipReason).toBe('NO_ACTIVE_VERSION');
      expect(mockEvalRepo.save).toHaveBeenCalledTimes(1);
      const row = mockEvalRepo.create.mock.calls[0][0];
      expect(row.ruleSetId).toBe('rs-broken');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toContain('NO_ACTIVE_VERSION');
    });

    it('no governance configured (rules empty, no skip signal) → ALLOW, no receipt', async () => {
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
        entity: {},
        actor: { userId: 'actor-1', platformRole: 'MEMBER' },
      });

      expect(result.decision).toBe(EvaluationDecision.ALLOW);
      expect(result.evaluationId).toBeNull();
      expect(mockEvalRepo.save).not.toHaveBeenCalled();
    });
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
