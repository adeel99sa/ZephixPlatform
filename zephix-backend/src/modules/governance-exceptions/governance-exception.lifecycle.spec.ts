import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GovernanceExceptionsService } from './governance-exceptions.service';
import { GovernanceException } from './entities/governance-exception.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { Project } from '../projects/entities/project.entity';
import { AuditService } from '../audit/services/audit.service';
import { AuditAction } from '../audit/audit.constants';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeException(
  overrides: Partial<GovernanceException> = {},
): GovernanceException {
  return {
    id: 'ex-1',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    projectId: 'proj-1',
    exceptionType: 'GOVERNANCE_RULE',
    status: 'APPROVED',
    reason: 'Task blocked: phase gate not yet approved',
    requestedByUserId: 'user-requester',
    resolvedByUserId: 'user-admin',
    resolutionNote: null,
    auditEventId: null,
    metadata: { taskId: 'task-1', toStatus: 'DONE' },
    createdAt: new Date('2026-07-06T00:00:00Z'),
    updatedAt: new Date('2026-07-06T01:00:00Z'),
    ...overrides,
  } as GovernanceException;
}

function makeQb(returnValue: GovernanceException | null) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(returnValue),
  };
}

function makeService(
  repoOverrides: Partial<{
    findOne: jest.Mock;
    save: jest.Mock;
    count: jest.Mock;
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
  }> = {},
) {
  const repo: any = {
    create: jest.fn((input) => input),
    save: jest.fn(async (row) => ({ ...row })),
    findOne: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn(() => makeQb(null)),
    ...repoOverrides,
  };
  // EX-1: consumeException/resolve run inside repo.manager.transaction(). The
  // mock executes the callback; manager.save routes to repo.save so the existing
  // repo.save assertions (status→CONSUMED, resolvedByUserId) observe the real
  // mutation unchanged.
  repo.manager = {
    transaction: jest.fn(async (cb: any) =>
      cb({ save: async (_entity: unknown, row: any) => repo.save(row) }),
    ),
  };
  // EX-1: the service now audits via the fail-closed recordOrThrow. Route it
  // through record() so the existing "audit recorded" assertions observe the
  // same content unchanged (the EXCEPTION_CONSUMED invariant is not weakened).
  const audit: any = { record: jest.fn().mockResolvedValue({ id: 'audit-uuid' }) };
  audit.recordOrThrow = jest.fn(async (input: unknown) => audit.record(input));

  return { repo, audit };
}

async function buildService(
  repoOverrides: Parameters<typeof makeService>[0] = {},
) {
  const { repo, audit } = makeService(repoOverrides);
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      GovernanceExceptionsService,
      { provide: getRepositoryToken(GovernanceException), useValue: repo },
      // EX-1: GovernanceExceptionsService gained Workspace + Project repos.
      { provide: getRepositoryToken(Workspace), useValue: { findOne: jest.fn(), find: jest.fn() } },
      { provide: getRepositoryToken(Project), useValue: { findOne: jest.fn(), find: jest.fn() } },
      { provide: AuditService, useValue: audit },
    ],
  }).compile();
  const svc = module.get(GovernanceExceptionsService);
  return { svc, repo, audit };
}

// ── findApprovedUnconsumedForTaskTransition ──────────────────────────────────

describe('findApprovedUnconsumedForTaskTransition', () => {
  it('returns null when no APPROVED exception exists (PENDING only)', async () => {
    const { svc } = await buildService();
    const result = await svc.findApprovedUnconsumedForTaskTransition({
      organizationId: 'org-1',
      taskId: 'task-1',
      toStatus: 'DONE',
    });
    expect(result).toBeNull();
  });

  it('returns exception when APPROVED unconsumed exception exists', async () => {
    const approvedEx = makeException({ status: 'APPROVED' });
    const { svc } = await buildService({
      createQueryBuilder: jest.fn(() => makeQb(approvedEx)),
    });

    const result = await svc.findApprovedUnconsumedForTaskTransition({
      organizationId: 'org-1',
      taskId: 'task-1',
      toStatus: 'DONE',
    });
    expect(result).toBe(approvedEx);
  });

  it('does NOT return exception for a different organizationId (cross-tenant isolation)', async () => {
    const approvedEx = makeException({ organizationId: 'org-other' });
    const qb = makeQb(null);
    const { svc, repo } = await buildService({
      createQueryBuilder: jest.fn(() => qb),
    });

    // Query builder is called with the correct org; the mock returns null (simulating isolation)
    const result = await svc.findApprovedUnconsumedForTaskTransition({
      organizationId: 'org-1',
      taskId: 'task-1',
      toStatus: 'DONE',
    });
    expect(result).toBeNull();
    // First .where() call must bind organizationId
    const firstWhereCall = qb.where.mock.calls[0];
    expect(firstWhereCall[0]).toMatch(/organization_id/);
    expect(firstWhereCall[1]).toEqual({ organizationId: 'org-1' });
  });

  it('filters on status=APPROVED (not PENDING, not CONSUMED)', async () => {
    const qb = makeQb(null);
    const { svc } = await buildService({
      createQueryBuilder: jest.fn(() => qb),
    });

    await svc.findApprovedUnconsumedForTaskTransition({
      organizationId: 'org-1',
      taskId: 'task-1',
      toStatus: 'DONE',
    });

    const statusCall = qb.andWhere.mock.calls.find((c: string[]) =>
      String(c[0]).includes('status'),
    );
    expect(statusCall).toBeDefined();
    expect(statusCall![1]).toEqual({ status: 'APPROVED' });
  });
});

// ── consumeException ─────────────────────────────────────────────────────────

describe('consumeException', () => {
  it('flips status from APPROVED to CONSUMED', async () => {
    const ex = makeException({ status: 'APPROVED' });
    const { svc, repo } = await buildService({
      findOne: jest.fn().mockResolvedValue(ex),
      save: jest.fn(async (row) => row),
    });

    const result = await svc.consumeException('ex-1', 'org-1', 'user-actor');
    expect(result.status).toBe('CONSUMED');
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'CONSUMED' }),
    );
  });

  it('records EXCEPTION_CONSUMED audit event on consumption', async () => {
    const ex = makeException({ status: 'APPROVED' });
    const { svc, audit } = await buildService({
      findOne: jest.fn().mockResolvedValue(ex),
      save: jest.fn(async (row) => row),
    });

    await svc.consumeException('ex-1', 'org-1', 'user-actor');

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.GOVERNANCE_EVALUATE,
        actorUserId: 'user-actor',
        metadata: expect.objectContaining({
          governanceType: 'EXCEPTION_CONSUMED',
          exceptionId: 'ex-1',
        }),
      }),
    );
  });

  it('throws ForbiddenException when exception is not APPROVED (PENDING)', async () => {
    const ex = makeException({ status: 'PENDING' });
    const { svc } = await buildService({
      findOne: jest.fn().mockResolvedValue(ex),
    });

    await expect(
      svc.consumeException('ex-1', 'org-1', 'user-actor'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when exception is not APPROVED (CONSUMED)', async () => {
    const ex = makeException({ status: 'CONSUMED' });
    const { svc } = await buildService({
      findOne: jest.fn().mockResolvedValue(ex),
    });

    await expect(
      svc.consumeException('ex-1', 'org-1', 'user-actor'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException when exception not found (wrong org)', async () => {
    const { svc } = await buildService({
      findOne: jest.fn().mockResolvedValue(null),
    });

    await expect(
      svc.consumeException('ex-1', 'org-wrong', 'user-actor'),
    ).rejects.toThrow(NotFoundException);
  });

  it('sets resolvedByUserId to the consuming actor', async () => {
    const ex = makeException({ status: 'APPROVED', resolvedByUserId: null });
    const { svc, repo } = await buildService({
      findOne: jest.fn().mockResolvedValue(ex),
      save: jest.fn(async (row) => row),
    });

    await svc.consumeException('ex-1', 'org-1', 'user-consumer');

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ resolvedByUserId: 'user-consumer' }),
    );
  });
});

// ── lifecycle invariants ─────────────────────────────────────────────────────

describe('lifecycle invariants', () => {
  it('resolve() accepts APPROVED as a valid decision transition from PENDING', async () => {
    const ex = makeException({ status: 'PENDING', resolvedByUserId: null });
    const { svc, repo } = await buildService({
      findOne: jest.fn().mockResolvedValue(ex),
      save: jest.fn(async (row) => row),
    });

    const result = await svc.resolve('ex-1', 'org-1', 'admin-user', 'APPROVED', 'LGTM');
    expect(result.status).toBe('APPROVED');
    expect(result.resolvedByUserId).toBe('admin-user');
    expect(result.resolutionNote).toBe('LGTM');
  });

  it('resolve() throws ForbiddenException when attempting to re-resolve a CONSUMED exception', async () => {
    const ex = makeException({ status: 'CONSUMED' });
    const { svc } = await buildService({
      findOne: jest.fn().mockResolvedValue(ex),
    });

    await expect(
      svc.resolve('ex-1', 'org-1', 'admin-user', 'APPROVED'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('resolve() throws ForbiddenException when attempting to re-resolve a REJECTED exception', async () => {
    const ex = makeException({ status: 'REJECTED' });
    const { svc } = await buildService({
      findOne: jest.fn().mockResolvedValue(ex),
    });

    await expect(
      svc.resolve('ex-1', 'org-1', 'admin-user', 'APPROVED'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('single-use: after consumeException, findApprovedUnconsumed returns null (CONSUMED not APPROVED)', async () => {
    // Simulate: first call returns APPROVED, second returns null (after consume)
    const qbApproved = makeQb(makeException({ status: 'APPROVED' }));
    const qbNull = makeQb(null);
    let callCount = 0;
    const { svc, repo } = await buildService({
      findOne: jest.fn().mockResolvedValue(makeException({ status: 'APPROVED' })),
      save: jest.fn(async (row) => row),
      createQueryBuilder: jest.fn(() => {
        callCount += 1;
        return callCount === 1 ? qbApproved : qbNull;
      }),
    });

    // First call: should find APPROVED
    const first = await svc.findApprovedUnconsumedForTaskTransition({
      organizationId: 'org-1',
      taskId: 'task-1',
      toStatus: 'DONE',
    });
    expect(first).not.toBeNull();

    // Consume it
    await svc.consumeException('ex-1', 'org-1', 'user-actor');

    // Second call: CONSUMED exception is no longer returned (status filter = APPROVED only)
    const second = await svc.findApprovedUnconsumedForTaskTransition({
      organizationId: 'org-1',
      taskId: 'task-1',
      toStatus: 'DONE',
    });
    expect(second).toBeNull();
  });
});
