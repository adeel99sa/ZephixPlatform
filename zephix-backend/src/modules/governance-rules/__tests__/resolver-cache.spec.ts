import { GovernanceRuleResolverService } from '../services/governance-rule-resolver.service';
import { GovernanceEntityType, ScopeType, EnforcementMode } from '../entities/governance-rule-set.entity';
import { ConditionSeverity } from '../entities/governance-rule.entity';

describe('GovernanceRuleResolverService – Cache', () => {
  function createMockRepos() {
    let ruleSetCallCount = 0;
    const ruleSetQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(() => {
        ruleSetCallCount++;
        return Promise.resolve([]);
      }),
    };
    const avQb = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(() => Promise.resolve([])),
    };
    const ruleQb = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(() => Promise.resolve([])),
    };

    return {
      ruleSetRepo: { createQueryBuilder: jest.fn(() => ruleSetQb) },
      activeVersionRepo: { createQueryBuilder: jest.fn(() => avQb) },
      ruleRepo: { createQueryBuilder: jest.fn(() => ruleQb) },
      getRuleSetCallCount: () => ruleSetCallCount,
    };
  }

  it('second resolve call within TTL hits cache (0 DB queries)', async () => {
    const { ruleSetRepo, activeVersionRepo, ruleRepo, getRuleSetCallCount } = createMockRepos();
    const service = new GovernanceRuleResolverService(
      ruleSetRepo as any,
      activeVersionRepo as any,
      ruleRepo as any,
    );

    const params = {
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      entityType: GovernanceEntityType.TASK,
    };

    await service.resolve(params);
    expect(getRuleSetCallCount()).toBe(1);

    await service.resolve(params);
    expect(getRuleSetCallCount()).toBe(1); // Still 1 — cache hit
  });

  it('bustCache forces next resolve to hit DB', async () => {
    const { ruleSetRepo, activeVersionRepo, ruleRepo, getRuleSetCallCount } = createMockRepos();
    const service = new GovernanceRuleResolverService(
      ruleSetRepo as any,
      activeVersionRepo as any,
      ruleRepo as any,
    );

    const params = {
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      entityType: GovernanceEntityType.TASK,
    };

    await service.resolve(params);
    expect(getRuleSetCallCount()).toBe(1);

    service.bustCache();

    await service.resolve(params);
    expect(getRuleSetCallCount()).toBe(2); // Cache busted → hit DB again
  });

  it('invalidateCache is an alias for bustCache', async () => {
    const { ruleSetRepo, activeVersionRepo, ruleRepo, getRuleSetCallCount } = createMockRepos();
    const service = new GovernanceRuleResolverService(
      ruleSetRepo as any,
      activeVersionRepo as any,
      ruleRepo as any,
    );

    const params = {
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      entityType: GovernanceEntityType.TASK,
    };

    await service.resolve(params);
    expect(getRuleSetCallCount()).toBe(1);

    service.invalidateCache();

    await service.resolve(params);
    expect(getRuleSetCallCount()).toBe(2);
  });

  it('different resolve params get separate cache entries', async () => {
    const { ruleSetRepo, activeVersionRepo, ruleRepo, getRuleSetCallCount } = createMockRepos();
    const service = new GovernanceRuleResolverService(
      ruleSetRepo as any,
      activeVersionRepo as any,
      ruleRepo as any,
    );

    await service.resolve({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      entityType: GovernanceEntityType.TASK,
    });
    expect(getRuleSetCallCount()).toBe(1);

    await service.resolve({
      organizationId: 'org-1',
      workspaceId: 'ws-2',
      entityType: GovernanceEntityType.TASK,
    });
    expect(getRuleSetCallCount()).toBe(2); // Different workspace → cache miss
  });
});
