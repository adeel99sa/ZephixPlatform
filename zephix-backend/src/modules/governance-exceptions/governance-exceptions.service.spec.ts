import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GovernanceExceptionsService } from './governance-exceptions.service';
import { GovernanceException } from './entities/governance-exception.entity';
import { AuditService } from '../audit/services/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.constants';

describe('GovernanceExceptionsService', () => {
  let service: GovernanceExceptionsService;
  let repo: { create: jest.Mock; save: jest.Mock; createQueryBuilder: jest.Mock };
  let audit: { record: jest.Mock };

  beforeEach(async () => {
    repo = {
      create: jest.fn((input) => input),
      save: jest.fn(async (row) => ({ ...row, id: 'exception-uuid-1' })),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      })),
    };
    audit = { record: jest.fn().mockResolvedValue({ id: 'audit-1' }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GovernanceExceptionsService,
        { provide: getRepositoryToken(GovernanceException), useValue: repo },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(GovernanceExceptionsService);
  });

  it('create persists row and records EXCEPTION_CREATED audit', async () => {
    const saved = await service.create({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      exceptionType: 'GOVERNANCE_RULE',
      reason: 'Blocked',
      requestedByUserId: 'user-1',
      actorPlatformRole: 'MEMBER',
      metadata: { taskId: 't1' },
    });

    expect(saved.id).toBe('exception-uuid-1');
    expect(repo.save).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        actorUserId: 'user-1',
        actorPlatformRole: 'MEMBER',
        entityType: AuditEntityType.PROJECT,
        entityId: 'proj-1',
        action: AuditAction.GOVERNANCE_EVALUATE,
        metadata: expect.objectContaining({
          governanceType: 'EXCEPTION_CREATED',
          exceptionId: 'exception-uuid-1',
          exceptionType: 'GOVERNANCE_RULE',
        }),
      }),
    );
  });

  it('findPendingGovernanceRuleForTaskTransition returns matching row', async () => {
    const row = {
      id: 'p1',
      organizationId: 'org-1',
      status: 'PENDING',
      exceptionType: 'GOVERNANCE_RULE',
      metadata: { taskId: 't1', toStatus: 'DONE' },
    };
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(row),
    };
    repo.createQueryBuilder = jest.fn(() => qb as any);

    const found = await service.findPendingGovernanceRuleForTaskTransition({
      organizationId: 'org-1',
      taskId: 't1',
      toStatus: 'DONE',
    });

    expect(found).toEqual(row);
    expect(repo.createQueryBuilder).toHaveBeenCalledWith('e');
  });
});
