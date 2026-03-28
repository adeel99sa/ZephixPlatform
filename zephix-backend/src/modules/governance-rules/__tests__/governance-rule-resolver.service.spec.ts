import { GovernanceRuleResolverService } from '../services/governance-rule-resolver.service';
import { GovernanceEntityType, ScopeType, EnforcementMode } from '../entities/governance-rule-set.entity';
import { ConditionType, ConditionSeverity } from '../entities/governance-rule.entity';

describe('GovernanceRuleResolverService', () => {
  let service: GovernanceRuleResolverService;
  let mockRuleSetRepo: any;
  let mockActiveVersionRepo: any;
  let mockRuleRepo: any;

  beforeEach(() => {
    mockRuleSetRepo = {
      createQueryBuilder: jest.fn(),
    };
    mockActiveVersionRepo = {
      createQueryBuilder: jest.fn(),
    };
    mockRuleRepo = {
      createQueryBuilder: jest.fn(),
    };
    service = new GovernanceRuleResolverService(
      mockRuleSetRepo,
      mockActiveVersionRepo,
      mockRuleRepo,
    );
  });

  it('returns empty rules when no rule sets match', async () => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    mockRuleSetRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.resolve({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      entityType: GovernanceEntityType.TASK,
    });

    expect(result.entityType).toBe(GovernanceEntityType.TASK);
    expect(result.rules).toHaveLength(0);
  });

  it('returns empty rules when no active versions exist', async () => {
    const ruleSetQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'rs-1',
          scopeType: ScopeType.SYSTEM,
          enforcementMode: EnforcementMode.BLOCK,
          name: 'Test',
        },
      ]),
    };
    mockRuleSetRepo.createQueryBuilder.mockReturnValue(ruleSetQb);

    const avQb = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    mockActiveVersionRepo.createQueryBuilder.mockReturnValue(avQb);

    const result = await service.resolve({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      entityType: GovernanceEntityType.TASK,
    });

    expect(result.rules).toHaveLength(0);
  });

  it('resolves rules with scope precedence (PROJECT wins over SYSTEM)', async () => {
    const ruleSetQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'rs-system',
          scopeType: ScopeType.SYSTEM,
          enforcementMode: EnforcementMode.OFF,
          name: 'System Rules',
        },
        {
          id: 'rs-project',
          scopeType: ScopeType.PROJECT,
          enforcementMode: EnforcementMode.BLOCK,
          name: 'Project Rules',
        },
      ]),
    };
    mockRuleSetRepo.createQueryBuilder.mockReturnValue(ruleSetQb);

    const avQb = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          ruleSetId: 'rs-system',
          code: 'TASK_DONE_REQUIRES_ASSIGNEE',
          activeRuleId: 'rule-system',
        },
        {
          ruleSetId: 'rs-project',
          code: 'TASK_DONE_REQUIRES_ASSIGNEE',
          activeRuleId: 'rule-project',
        },
      ]),
    };
    mockActiveVersionRepo.createQueryBuilder.mockReturnValue(avQb);

    const ruleQb = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'rule-system',
          ruleSetId: 'rs-system',
          code: 'TASK_DONE_REQUIRES_ASSIGNEE',
          version: 1,
          ruleDefinition: {
            conditions: [],
            message: 'System version',
            severity: ConditionSeverity.ERROR,
          },
        },
        {
          id: 'rule-project',
          ruleSetId: 'rs-project',
          code: 'TASK_DONE_REQUIRES_ASSIGNEE',
          version: 1,
          ruleDefinition: {
            conditions: [],
            message: 'Project version',
            severity: ConditionSeverity.ERROR,
          },
        },
      ]),
    };
    mockRuleRepo.createQueryBuilder.mockReturnValue(ruleQb);

    const result = await service.resolve({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      entityType: GovernanceEntityType.TASK,
    });

    expect(result.rules).toHaveLength(1);
    expect(result.rules[0].ruleId).toBe('rule-project');
    expect(result.rules[0].enforcementMode).toBe(EnforcementMode.BLOCK);
  });

  it('merges rules from different codes', async () => {
    const ruleSetQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'rs-1',
          scopeType: ScopeType.SYSTEM,
          enforcementMode: EnforcementMode.BLOCK,
          name: 'System',
        },
      ]),
    };
    mockRuleSetRepo.createQueryBuilder.mockReturnValue(ruleSetQb);

    const avQb = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        { ruleSetId: 'rs-1', code: 'RULE_A', activeRuleId: 'r-a' },
        { ruleSetId: 'rs-1', code: 'RULE_B', activeRuleId: 'r-b' },
      ]),
    };
    mockActiveVersionRepo.createQueryBuilder.mockReturnValue(avQb);

    const ruleQb = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'r-a',
          ruleSetId: 'rs-1',
          code: 'RULE_A',
          version: 1,
          ruleDefinition: { conditions: [], message: 'A', severity: ConditionSeverity.ERROR },
        },
        {
          id: 'r-b',
          ruleSetId: 'rs-1',
          code: 'RULE_B',
          version: 1,
          ruleDefinition: { conditions: [], message: 'B', severity: ConditionSeverity.ERROR },
        },
      ]),
    };
    mockRuleRepo.createQueryBuilder.mockReturnValue(ruleQb);

    const result = await service.resolve({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      entityType: GovernanceEntityType.TASK,
    });

    expect(result.rules).toHaveLength(2);
    expect(result.rules[0].code).toBe('RULE_A');
    expect(result.rules[1].code).toBe('RULE_B');
  });

  it('sorts resolved rules deterministically by code', async () => {
    const ruleSetQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        { id: 'rs-1', scopeType: ScopeType.SYSTEM, enforcementMode: EnforcementMode.BLOCK, name: 'System' },
      ]),
    };
    mockRuleSetRepo.createQueryBuilder.mockReturnValue(ruleSetQb);

    const avQb = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        { ruleSetId: 'rs-1', code: 'Z_RULE', activeRuleId: 'r-z' },
        { ruleSetId: 'rs-1', code: 'A_RULE', activeRuleId: 'r-a' },
        { ruleSetId: 'rs-1', code: 'M_RULE', activeRuleId: 'r-m' },
      ]),
    };
    mockActiveVersionRepo.createQueryBuilder.mockReturnValue(avQb);

    const ruleQb = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        { id: 'r-z', ruleSetId: 'rs-1', code: 'Z_RULE', version: 1, ruleDefinition: { conditions: [], message: '', severity: ConditionSeverity.ERROR } },
        { id: 'r-a', ruleSetId: 'rs-1', code: 'A_RULE', version: 1, ruleDefinition: { conditions: [], message: '', severity: ConditionSeverity.ERROR } },
        { id: 'r-m', ruleSetId: 'rs-1', code: 'M_RULE', version: 1, ruleDefinition: { conditions: [], message: '', severity: ConditionSeverity.ERROR } },
      ]),
    };
    mockRuleRepo.createQueryBuilder.mockReturnValue(ruleQb);

    const result = await service.resolve({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      entityType: GovernanceEntityType.TASK,
    });

    expect(result.rules.map((r) => r.code)).toEqual(['A_RULE', 'M_RULE', 'Z_RULE']);
  });
});
