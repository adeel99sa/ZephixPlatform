import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GovernanceExceptionsService } from './governance-exceptions.service';
import { GovernanceException } from './entities/governance-exception.entity';
import { AuditService } from '../audit/services/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.constants';

describe('GovernanceExceptionsService', () => {
  let service: GovernanceExceptionsService;
  let repo: { create: jest.Mock; save: jest.Mock };
  let audit: { record: jest.Mock };

  beforeEach(async () => {
    repo = {
      create: jest.fn((input) => input),
      save: jest.fn(async (row) => ({ ...row, id: 'exception-uuid-1' })),
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
});
