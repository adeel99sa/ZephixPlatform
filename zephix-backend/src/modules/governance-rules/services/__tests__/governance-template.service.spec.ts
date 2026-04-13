import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import {
  GovernanceTemplateService,
  GOVERNANCE_POLICY_CODES,
} from '../governance-template.service';
import { GovernanceRuleResolverService } from '../governance-rule-resolver.service';

describe('GovernanceTemplateService', () => {
  const resolver = {
    invalidateCache: jest.fn(),
  } as unknown as GovernanceRuleResolverService;

  const templateRepo = {
    findOne: jest.fn(),
  } as unknown as Repository<any>;

  const ruleSetRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as unknown as Repository<any>;

  const ruleRepo = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  } as unknown as Repository<any>;

  const activeVersionRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as unknown as Repository<any>;

  const dataSource = { query: jest.fn().mockResolvedValue([]) } as any;

  const tpl = {
    id: 'tpl-1',
    organizationId: 'org-1',
    workspaceId: null,
    isSystem: false,
    isActive: true,
  };

  function svc() {
    return new GovernanceTemplateService(
      templateRepo as any,
      ruleSetRepo as any,
      ruleRepo as any,
      activeVersionRepo as any,
      resolver,
      dataSource,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('assertTemplateInOrganization throws when template missing', async () => {
    (templateRepo.findOne as jest.Mock).mockResolvedValue(null);
    await expect(
      svc().assertTemplateInOrganization('missing', 'org-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('bulkToggleTemplatePolicies rejects unknown policy codes', async () => {
    (templateRepo.findOne as jest.Mock).mockResolvedValue(tpl);
    await expect(
      svc().bulkToggleTemplatePolicies('tpl-1', { 'not-a-policy': true }, 'org-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('GOVERNANCE_POLICY_CODES has 8 entries', () => {
    expect(GOVERNANCE_POLICY_CODES.length).toBe(8);
  });

  it('getTemplateGovernance returns empty when no system rules resolve', async () => {
    (templateRepo.findOne as jest.Mock).mockResolvedValue(tpl);
    const avQb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    (activeVersionRepo.createQueryBuilder as jest.Mock).mockReturnValue(avQb);
    const ruleQb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    (ruleRepo.createQueryBuilder as jest.Mock).mockReturnValue(ruleQb);
    const rows = await svc().getTemplateGovernance('tpl-1', 'org-1');
    expect(rows).toEqual([]);
  });

  it('getTemplateGovernance marks enabled when join finds active version rows', async () => {
    (templateRepo.findOne as jest.Mock).mockResolvedValue(tpl);
    const avQb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          code: 'mandatory-fields',
          ruleSetId: 'ts-1',
          enforcementMode: 'BLOCK',
        },
      ]),
    };
    (activeVersionRepo.createQueryBuilder as jest.Mock).mockReturnValue(avQb);

    const systemRule = {
      ruleSet: {
        id: 'sys-set',
        entityType: 'TASK',
        enforcementMode: 'OFF',
      },
      ruleDefinition: { conditions: [] },
    };
    const ruleQb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockImplementation(() => {
        const i = (ruleQb.getOne as jest.Mock).mock.calls.length - 1;
        const code = GOVERNANCE_POLICY_CODES[i];
        if (code === 'mandatory-fields') return Promise.resolve(systemRule);
        return Promise.resolve(null);
      }),
    };
    (ruleRepo.createQueryBuilder as jest.Mock).mockReturnValue(ruleQb);

    const rows = await svc().getTemplateGovernance('tpl-1', 'org-1');
    expect(rows).toHaveLength(1);
    expect(rows[0].code).toBe('mandatory-fields');
    expect(rows[0].enabled).toBe(true);
    expect(rows[0].templateRuleSetId).toBe('ts-1');
    expect(rows[0].enforcementMode).toBe('BLOCK');
  });
});
