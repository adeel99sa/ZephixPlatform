import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GovernanceExceptionsService } from './governance-exceptions.service';
import { GovernanceException } from './entities/governance-exception.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { Project } from '../projects/entities/project.entity';
import { AuditService } from '../audit/services/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.constants';

// Configurable tx-manager mock. `affected` drives the ATOMICITY-1 conditional
// UPDATE (consumeException); `findOneRow` is what the post-update re-fetch returns.
// The REAL SQL/race is proven in consume-exception-race.real-schema.spec.ts —
// these unit mocks only exercise the audit/transaction/guard wiring.
function makeTxManager(saveFn?: jest.Mock, opts?: { affected?: number; findOneRow?: any }) {
  const managerSave = saveFn ?? jest.fn(async (_Entity: any, row: any) => ({ ...row }));
  const execute = jest.fn(async () => ({ affected: opts?.affected ?? 1, raw: [] }));
  const qb = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute,
  };
  const findOne = jest.fn(async () =>
    opts?.findOneRow ?? {
      id: 'exc-1', organizationId: 'org-1', workspaceId: 'ws-1',
      projectId: 'proj-1', exceptionType: 'GOVERNANCE_RULE', status: 'CONSUMED',
    },
  );
  const manager = {
    save: managerSave,
    createQueryBuilder: jest.fn(() => qb),
    findOne,
  };
  const transaction = jest.fn().mockImplementation(async (cb: (m: typeof manager) => Promise<void>) => cb(manager));
  return {
    manager: { transaction, save: managerSave, createQueryBuilder: manager.createQueryBuilder, findOne },
    txManagerSave: managerSave,
    transaction,
    execute,
    findOne,
  };
}

describe('GovernanceExceptionsService', () => {
  let service: GovernanceExceptionsService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    count: jest.Mock;
    createQueryBuilder: jest.Mock;
    manager: {
      transaction: jest.Mock;
      save: jest.Mock;
      createQueryBuilder: jest.Mock;
      findOne: jest.Mock;
    };
  };
  let audit: { record: jest.Mock; recordOrThrow: jest.Mock };
  let workspaceRepo: { find: jest.Mock; findOne: jest.Mock };
  let projectRepo: { find: jest.Mock };

  beforeEach(async () => {
    const tx = makeTxManager();
    repo = {
      create: jest.fn((input) => input),
      save: jest.fn(async (row) => ({ ...row, id: 'exception-uuid-1' })),
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
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
    workspaceRepo = {
      find: jest.fn().mockResolvedValue([]),
      // SOD-PORT-1: default STANDARD (self-approval permitted); GOVERNED cases
      // override findOne per-test.
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 'ws-1', complexityMode: 'standard' }),
    };
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

  it('consumeException does an atomic conditional UPDATE in a tx + audits with the manager', async () => {
    // Default mock: conditional UPDATE affects 1 row (the APPROVED->CONSUMED flip).
    await service.consumeException('exc-1', 'org-1', 'user-1');

    expect(repo.manager.transaction).toHaveBeenCalled();
    // The status flip is a conditional UPDATE (createQueryBuilder), NOT a
    // read-then-save — and NEVER a direct repo.save outside the tx.
    expect(repo.manager.createQueryBuilder).toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
    expect(audit.recordOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ governanceType: 'EXCEPTION_CONSUMED' }) }),
      expect.objectContaining({ manager: expect.anything() }),
    );
  });

  it('consumeException rolls back — audit failure throws and repo.save never committed', async () => {
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

  // ── getHealth (HONESTY-1) ───────────────────────────────────────────────────

  describe('getHealth', () => {
    it('org scope: no workspaceId → scope=organization, counts filter by org only', async () => {
      repo.count
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(2) // capacity
        .mockResolvedValueOnce(1) // budget
        .mockResolvedValueOnce(3); // hard blocks

      const health = await service.getHealth('org-1');

      expect(health).toEqual({
        activePolicies: 5,
        capacityWarnings: 2,
        budgetWarnings: 1,
        hardBlocksThisWeek: 3,
        scope: 'organization',
      });
      // no workspace filter on the pending count
      expect(repo.count.mock.calls[0][0].where).toEqual({
        organizationId: 'org-1',
        status: 'PENDING',
      });
    });

    it('workspace scope: workspaceId present → scope=workspace, every count carries workspaceId', async () => {
      repo.count.mockResolvedValue(0);

      const health = await service.getHealth('org-1', 'ws-9');

      expect(health.scope).toBe('workspace');
      for (const call of repo.count.mock.calls) {
        expect(call[0].where.organizationId).toBe('org-1');
        expect(call[0].where.workspaceId).toBe('ws-9');
      }
    });

    it('hardBlocksThisWeek counts GOVERNANCE_RULE in the last 7 days (real, not a literal 0)', async () => {
      repo.count.mockResolvedValue(0);
      await service.getHealth('org-1');

      const hardBlockCall = repo.count.mock.calls[3][0];
      expect(hardBlockCall.where.exceptionType).toBe('GOVERNANCE_RULE');
      // createdAt is a MoreThanOrEqual(FindOperator) with a ~7-day-ago value
      const createdAt = hardBlockCall.where.createdAt;
      expect(createdAt).toBeDefined();
      const cutoff = createdAt.value as Date;
      const ageMs = Date.now() - cutoff.getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(Math.abs(ageMs - sevenDaysMs)).toBeLessThan(60_000); // within a minute
    });
  });

  // ── resolve — SOD-PORT-1 self-approval control ──────────────────────────────

  describe('resolve self-approval (SOD-PORT-1)', () => {
    const selfPending = {
      id: 'exc-self',
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      exceptionType: 'GOVERNANCE_RULE',
      status: 'PENDING',
      requestedByUserId: 'user-1',
      resolvedByUserId: null,
      resolutionNote: null,
    };

    it('GOVERNED: requester cannot APPROVE their own exception (blocked, no write)', async () => {
      repo.findOne = jest.fn().mockResolvedValue({ ...selfPending });
      workspaceRepo.findOne.mockResolvedValue({
        id: 'ws-1',
        complexityMode: 'governed',
      });

      await expect(
        service.resolve('exc-self', 'org-1', 'user-1', 'APPROVED'),
      ).rejects.toThrow(ForbiddenException);
      expect(repo.manager.transaction).not.toHaveBeenCalled();
    });

    it('STANDARD: requester MAY approve their own, and it is flagged self_resolved', async () => {
      const row: any = { ...selfPending };
      repo.findOne = jest.fn().mockResolvedValue(row);
      workspaceRepo.findOne.mockResolvedValue({
        id: 'ws-1',
        complexityMode: 'standard',
      });

      await service.resolve('exc-self', 'org-1', 'user-1', 'APPROVED', 'ok');

      expect(row.selfResolved).toBe(true);
      const auditMeta = audit.recordOrThrow.mock.calls[0][0].metadata;
      expect(auditMeta.selfResolved).toBe(true);
    });

    it('GOVERNED: self-REJECT is NOT blocked (only APPROVE is banned)', async () => {
      const row: any = { ...selfPending };
      repo.findOne = jest.fn().mockResolvedValue(row);
      workspaceRepo.findOne.mockResolvedValue({
        id: 'ws-1',
        complexityMode: 'governed',
      });

      await expect(
        service.resolve('exc-self', 'org-1', 'user-1', 'REJECTED', 'no'),
      ).resolves.toBeDefined();
      expect(row.selfResolved).toBe(true); // resolver === requester
    });

    it('peer approval is never self_resolved regardless of mode', async () => {
      const row: any = { ...selfPending };
      repo.findOne = jest.fn().mockResolvedValue(row);
      workspaceRepo.findOne.mockResolvedValue({
        id: 'ws-1',
        complexityMode: 'governed',
      });

      await service.resolve('exc-self', 'org-1', 'resolver-2', 'APPROVED', 'ok');

      expect(row.selfResolved).toBe(false);
      const auditMeta = audit.recordOrThrow.mock.calls[0][0].metadata;
      expect(auditMeta.selfResolved).toBe(false);
    });
  });
});
