import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GovernanceExceptionsService } from './governance-exceptions.service';
import { GovernanceException } from './entities/governance-exception.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { Project } from '../projects/entities/project.entity';
import { AuditService } from '../audit/services/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.constants';

function makeTxManager(saveFn?: jest.Mock) {
  const managerSave = saveFn ?? jest.fn(async (_Entity: any, row: any) => ({ ...row }));
  const manager = { save: managerSave };
  const transaction = jest.fn().mockImplementation(async (cb: (m: typeof manager) => Promise<void>) => cb(manager));
  return { manager: { transaction, save: managerSave }, txManagerSave: managerSave, transaction };
}

describe('GovernanceExceptionsService', () => {
  let service: GovernanceExceptionsService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
    manager: { transaction: jest.Mock; save: jest.Mock };
  };
  let audit: { record: jest.Mock; recordOrThrow: jest.Mock };
  let workspaceRepo: { find: jest.Mock };
  let projectRepo: { find: jest.Mock };

  beforeEach(async () => {
    const tx = makeTxManager();
    repo = {
      create: jest.fn((input) => input),
      save: jest.fn(async (row) => ({ ...row, id: 'exception-uuid-1' })),
      findOne: jest.fn().mockResolvedValue(null),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      })),
      manager: tx.manager,
    };
    audit = {
      record: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      recordOrThrow: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };
    workspaceRepo = { find: jest.fn().mockResolvedValue([]) };
    projectRepo = { find: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GovernanceExceptionsService,
        { provide: getRepositoryToken(GovernanceException), useValue: repo },
        { provide: getRepositoryToken(Workspace), useValue: workspaceRepo },
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(GovernanceExceptionsService);
  });

  // ── create ────────────────────────────────────────────────────────────────

  it('create persists row and records EXCEPTION_CREATED audit via recordOrThrow', async () => {
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
    expect(audit.recordOrThrow).toHaveBeenCalledWith(
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

  it('create throws when audit write fails (fail-closed)', async () => {
    audit.recordOrThrow.mockRejectedValueOnce(new Error('DB_WRITE_FAILED'));
    await expect(
      service.create({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        exceptionType: 'GOVERNANCE_RULE',
        reason: 'Blocked',
        requestedByUserId: 'user-1',
        actorPlatformRole: 'MEMBER',
      }),
    ).rejects.toThrow('DB_WRITE_FAILED');
  });

  // ── consumeException — transactional ─────────────────────────────────────

  it('consumeException uses a transaction wrapping status-save + audit', async () => {
    const approvedException = {
      id: 'exc-1', organizationId: 'org-1', workspaceId: 'ws-1',
      projectId: 'proj-1', exceptionType: 'GOVERNANCE_RULE',
      status: 'APPROVED', resolvedByUserId: null,
    };
    repo.findOne = jest.fn().mockResolvedValue(approvedException);

    await service.consumeException('exc-1', 'org-1', 'user-1');

    expect(repo.manager.transaction).toHaveBeenCalled();
    // Direct repo.save must NOT be called — only manager.save inside the tx
    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.manager.save).toHaveBeenCalledWith(GovernanceException, expect.objectContaining({ status: 'CONSUMED' }));
    expect(audit.recordOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ governanceType: 'EXCEPTION_CONSUMED' }) }),
      expect.objectContaining({ manager: expect.anything() }),
    );
  });

  it('consumeException rolls back — audit failure throws and repo.save never committed', async () => {
    const approvedException = {
      id: 'exc-1', organizationId: 'org-1', workspaceId: 'ws-1',
      projectId: 'proj-1', exceptionType: 'GOVERNANCE_RULE',
      status: 'APPROVED', resolvedByUserId: null,
    };
    repo.findOne = jest.fn().mockResolvedValue(approvedException);
    audit.recordOrThrow.mockRejectedValueOnce(new Error('DB_WRITE_FAILED'));

    await expect(
      service.consumeException('exc-1', 'org-1', 'user-1'),
    ).rejects.toThrow('DB_WRITE_FAILED');

    // Transaction aborted — repo.save (outer) was never called, proving no committed write outside tx
    expect(repo.save).not.toHaveBeenCalled();
  });

  // ── resolve — transactional ───────────────────────────────────────────────

  it('resolve uses a transaction wrapping status-save + audit', async () => {
    const pendingException = {
      id: 'exc-2', organizationId: 'org-1', workspaceId: 'ws-1',
      projectId: 'proj-1', exceptionType: 'GOVERNANCE_RULE',
      status: 'PENDING', resolvedByUserId: null, resolutionNote: null,
    };
    repo.findOne = jest.fn().mockResolvedValue(pendingException);

    await service.resolve('exc-2', 'org-1', 'resolver-1', 'APPROVED', 'LGTM');

    expect(repo.manager.transaction).toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.manager.save).toHaveBeenCalledWith(GovernanceException, expect.objectContaining({ status: 'APPROVED' }));
    expect(audit.recordOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ governanceType: 'EXCEPTION_RESOLUTION', decision: 'APPROVED' }) }),
      expect.objectContaining({ manager: expect.anything() }),
    );
  });

  it('resolve rolls back — audit failure throws and repo.save never committed', async () => {
    const pendingException = {
      id: 'exc-2', organizationId: 'org-1', workspaceId: 'ws-1',
      projectId: 'proj-1', exceptionType: 'GOVERNANCE_RULE',
      status: 'PENDING', resolvedByUserId: null, resolutionNote: null,
    };
    repo.findOne = jest.fn().mockResolvedValue(pendingException);
    audit.recordOrThrow.mockRejectedValueOnce(new Error('DB_WRITE_FAILED'));

    await expect(
      service.resolve('exc-2', 'org-1', 'resolver-1', 'APPROVED', 'LGTM'),
    ).rejects.toThrow('DB_WRITE_FAILED');

    expect(repo.save).not.toHaveBeenCalled();
  });

  // ── findPendingGovernanceRuleForTaskTransition ────────────────────────────

  it('findPendingGovernanceRuleForTaskTransition returns matching row', async () => {
    const row = {
      id: 'p1', organizationId: 'org-1', status: 'PENDING',
      exceptionType: 'GOVERNANCE_RULE', metadata: { taskId: 't1', toStatus: 'DONE' },
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

  it('resolvePendingDecisionContext maps workspace and project names (org-scoped)', async () => {
    workspaceRepo.find.mockResolvedValueOnce([
      { id: 'ws-1', name: 'GovProofFinal' },
    ]);
    projectRepo.find.mockResolvedValueOnce([
      { id: 'proj-1', name: 'Gov Test Project' },
    ]);

    const rows = [
      {
        id: 'exc-1',
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        projectId: null,
        metadata: { projectId: 'proj-1' },
      },
    ] as unknown as GovernanceException[];

    const { workspaceNames, projectNames } =
      await service.resolvePendingDecisionContext('org-1', rows);

    expect(workspaceNames.get('ws-1')).toBe('GovProofFinal');
    expect(projectNames.get('proj-1')).toBe('Gov Test Project');
    expect(workspaceRepo.find).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', id: expect.anything() },
      select: ['id', 'name'],
    });
    expect(projectRepo.find).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', id: expect.anything() },
      select: ['id', 'name'],
    });
  });

  it('resolveProjectId prefers row.projectId then metadata.projectId', () => {
    expect(
      service.resolveProjectId({
        projectId: 'proj-row',
        metadata: { projectId: 'proj-meta' },
      } as unknown as GovernanceException),
    ).toBe('proj-row');
    expect(
      service.resolveProjectId({
        projectId: null,
        metadata: { projectId: 'proj-meta' },
      } as unknown as GovernanceException),
    ).toBe('proj-meta');
    expect(
      service.resolveProjectId({
        projectId: null,
        metadata: null,
      } as unknown as GovernanceException),
    ).toBeNull();
  });
});
