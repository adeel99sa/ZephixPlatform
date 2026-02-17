import { GovernanceRuleEngineService } from '../services/governance-rule-engine.service';
import { GovernanceRuleResolverService } from '../services/governance-rule-resolver.service';
import { GovernanceRulesAdminService } from '../services/governance-rules-admin.service';
import { GovernanceEntityType, ScopeType, EnforcementMode } from '../entities/governance-rule-set.entity';
import { ConditionType, ConditionSeverity } from '../entities/governance-rule.entity';
import { EvaluationDecision, TransitionType } from '../entities/governance-evaluation.entity';

/**
 * Query budget tests for Wave 9.4.
 *
 * These tests instrument the resolver and engine with spy-counted
 * repository calls to assert bounded DB round-trips per request.
 *
 * Budgets:
 *   - Task status change:      <= 6 queries (3 resolver + 1 audit insert + 2 buffer)
 *   - CR approve:              <= 6 queries
 *   - Admin list evaluations:  <= 2 queries (getManyAndCount = 1 logical)
 */
describe('Query Budget Tests', () => {
  // --- Helpers: Spy-counted repos ---

  let queryCount: number;

  function createCountedRepo(data: { getMany?: any[]; getManyAndCount?: [any[], number] } = {}) {
    const spy = () => { queryCount++; };
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getMany: jest.fn(() => { spy(); return Promise.resolve(data.getMany ?? []); }),
      getManyAndCount: jest.fn(() => { spy(); return Promise.resolve(data.getManyAndCount ?? [[], 0]); }),
    };
    return {
      createQueryBuilder: jest.fn(() => qb),
      create: jest.fn((d: any) => ({ id: 'eval-1', ...d })),
      save: jest.fn((d: any) => { spy(); return Promise.resolve({ id: 'eval-1', ...d }); }),
      find: jest.fn(() => { spy(); return Promise.resolve([]); }),
      findOne: jest.fn(() => { spy(); return Promise.resolve(null); }),
      _qb: qb,
    };
  }

  beforeEach(() => {
    queryCount = 0;
  });

  // --- Budget: Task status change <= 6 queries ---

  describe('Task status change query budget', () => {
    it('uses <= 6 DB queries when rules exist and conditions fail', async () => {
      const ruleSetRepo = createCountedRepo({
        getMany: [{
          id: 'rs-1',
          scopeType: ScopeType.SYSTEM,
          enforcementMode: EnforcementMode.BLOCK,
          name: 'Task Guards',
        }],
      });
      const activeVersionRepo = createCountedRepo({
        getMany: [{
          ruleSetId: 'rs-1',
          code: 'TASK_DONE_REQUIRES_ASSIGNEE',
          activeRuleId: 'rule-1',
        }],
      });
      const ruleRepo = createCountedRepo({
        getMany: [{
          id: 'rule-1',
          ruleSetId: 'rs-1',
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
        }],
      });

      const evalRepo = createCountedRepo();

      const resolver = new GovernanceRuleResolverService(
        ruleSetRepo as any,
        activeVersionRepo as any,
        ruleRepo as any,
      );

      // Bust the cache so we hit the DB
      resolver.bustCache();

      const engine = new GovernanceRuleEngineService(resolver, evalRepo as any);

      const result = await engine.evaluateTaskStatusChange({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        taskId: 'task-1',
        fromStatus: 'IN_PROGRESS',
        toStatus: 'DONE',
        task: { assigneeUserId: null, acceptanceCriteria: '' },
        actor: { userId: 'actor-1', platformRole: 'MEMBER' },
        projectId: 'proj-1',
      });

      expect(result.decision).toBe(EvaluationDecision.BLOCK);

      // Budget: 3 resolver reads + 1 audit insert = 4
      // Allow up to 6 for buffer (related entity fetches in future)
      expect(queryCount).toBeLessThanOrEqual(6);
      expect(queryCount).toBeGreaterThanOrEqual(4);
    });

    it('uses 0 DB queries on cache hit', async () => {
      const ruleSetRepo = createCountedRepo({ getMany: [] });
      const activeVersionRepo = createCountedRepo({ getMany: [] });
      const ruleRepo = createCountedRepo({ getMany: [] });
      const evalRepo = createCountedRepo();

      const resolver = new GovernanceRuleResolverService(
        ruleSetRepo as any,
        activeVersionRepo as any,
        ruleRepo as any,
      );

      const engine = new GovernanceRuleEngineService(resolver, evalRepo as any);

      // First call populates cache (no rules = no audit insert)
      await engine.evaluateTaskStatusChange({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        taskId: 'task-1',
        fromStatus: 'TODO',
        toStatus: 'IN_PROGRESS',
        task: {},
        actor: { userId: 'actor-1', platformRole: 'MEMBER' },
      });

      const firstCallCount = queryCount;
      expect(firstCallCount).toBe(1); // 1 resolver query (rule sets = empty → short circuit)

      // Second call should hit cache → 0 additional queries
      queryCount = 0;
      await engine.evaluateTaskStatusChange({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        taskId: 'task-2',
        fromStatus: 'TODO',
        toStatus: 'IN_PROGRESS',
        task: {},
        actor: { userId: 'actor-1', platformRole: 'MEMBER' },
      });

      expect(queryCount).toBe(0);
    });
  });

  // --- Budget: CR approve <= 6 queries ---

  describe('CR approve query budget', () => {
    it('uses <= 6 DB queries for CR approval evaluation', async () => {
      const ruleSetRepo = createCountedRepo({
        getMany: [{
          id: 'rs-cr',
          scopeType: ScopeType.SYSTEM,
          enforcementMode: EnforcementMode.BLOCK,
          name: 'CR Guards',
        }],
      });
      const activeVersionRepo = createCountedRepo({
        getMany: [{
          ruleSetId: 'rs-cr',
          code: 'CR_APPROVED_REQUIRES_APPROVALS',
          activeRuleId: 'rule-cr',
        }],
      });
      const ruleRepo = createCountedRepo({
        getMany: [{
          id: 'rule-cr',
          ruleSetId: 'rs-cr',
          code: 'CR_APPROVED_REQUIRES_APPROVALS',
          version: 1,
          ruleDefinition: {
            when: { toStatus: 'APPROVED' },
            conditions: [
              { type: ConditionType.APPROVALS_MET, params: { requiredCount: 1 } },
            ],
            message: 'Approvals required',
            severity: ConditionSeverity.ERROR,
          },
        }],
      });
      const evalRepo = createCountedRepo();

      const resolver = new GovernanceRuleResolverService(
        ruleSetRepo as any,
        activeVersionRepo as any,
        ruleRepo as any,
      );
      resolver.bustCache();

      const engine = new GovernanceRuleEngineService(resolver, evalRepo as any);

      const result = await engine.evaluateChangeRequestStatusChange({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        crId: 'cr-1',
        fromStatus: 'SUBMITTED',
        toStatus: 'APPROVED',
        changeRequest: { id: 'cr-1' },
        actor: { userId: 'actor-1', platformRole: 'ADMIN', workspaceRole: 'OWNER' },
        relatedEntities: { approvals: [] },
      });

      expect(result.decision).toBe(EvaluationDecision.BLOCK);
      expect(queryCount).toBeLessThanOrEqual(6);
    });
  });

  // --- Budget: Admin list evaluations <= 2 queries ---

  describe('Admin list evaluations query budget', () => {
    it('uses <= 2 DB queries for listing evaluations', async () => {
      const evalRepo = createCountedRepo({
        getManyAndCount: [
          [{ id: 'e-1' }, { id: 'e-2' }],
          2,
        ],
      });

      const adminService = new GovernanceRulesAdminService(
        createCountedRepo() as any,
        createCountedRepo() as any,
        createCountedRepo() as any,
        evalRepo as any,
        { invalidateCache: jest.fn() } as any,
      );

      const result = await adminService.listEvaluations({
        workspaceId: 'ws-1',
        limit: 50,
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      // getManyAndCount is 1 logical query (TypeORM executes it as 1 query)
      expect(queryCount).toBeLessThanOrEqual(2);
    });
  });
});
