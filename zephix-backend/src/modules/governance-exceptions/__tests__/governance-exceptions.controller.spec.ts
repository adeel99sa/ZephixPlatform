import { Test, TestingModule } from '@nestjs/testing';
import { GovernanceExceptionsController } from '../governance-exceptions.controller';
import { GovernanceExceptionsService } from '../governance-exceptions.service';
import { ResponseService } from '../../../shared/services/response.service';
import { AuthRequest } from '../../../common/http/auth-request';

/**
 * HONESTY-1 (2.2) regression: the workspaceId filter must reach BOTH the health
 * payload and the Pending Decisions queue. listPendingDecisions previously
 * ignored workspaceId (silent no-op) so the tab showed the whole org's queue
 * beside a workspace-scoped Policies catalog. These tests assert the param is
 * forwarded, not dropped.
 */
describe('GovernanceExceptionsController (HONESTY-1 workspace scoping)', () => {
  let controller: GovernanceExceptionsController;
  let service: {
    getHealth: jest.Mock;
    listByOrg: jest.Mock;
    listResolvedApprovals: jest.Mock;
    resolvePendingDecisionContext: jest.Mock;
    resolveProjectId: jest.Mock;
    resolveActorNames: jest.Mock;
  };

  const req = {
    user: { id: 'u-1', email: 'a@b.c', organizationId: 'org-1', platformRole: 'ADMIN' },
  } as unknown as AuthRequest;

  beforeEach(async () => {
    service = {
      getHealth: jest.fn().mockResolvedValue({ scope: 'workspace' }),
      listByOrg: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      listResolvedApprovals: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      resolvePendingDecisionContext: jest
        .fn()
        .mockResolvedValue({ workspaceNames: new Map(), projectNames: new Map() }),
      resolveProjectId: jest.fn().mockReturnValue(null),
      resolveActorNames: jest.fn().mockResolvedValue(new Map()),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GovernanceExceptionsController],
      providers: [
        { provide: GovernanceExceptionsService, useValue: service },
        {
          provide: ResponseService,
          useValue: { success: (data: unknown, meta?: unknown) => ({ data, meta }) },
        },
      ],
    }).compile();

    controller = module.get(GovernanceExceptionsController);
  });

  it('getHealth forwards workspaceId to the service', async () => {
    await controller.getHealth(req, 'ws-9');
    expect(service.getHealth).toHaveBeenCalledWith('org-1', 'ws-9');
  });

  it('getHealth without workspaceId passes undefined (org scope)', async () => {
    await controller.getHealth(req, undefined);
    expect(service.getHealth).toHaveBeenCalledWith('org-1', undefined);
  });

  it('listPendingDecisions forwards workspaceId into the queue filter (no longer a no-op)', async () => {
    await controller.listPendingDecisions(req, 'ws-9', '1', '20');
    expect(service.listByOrg).toHaveBeenCalledWith(
      'org-1',
      { status: 'PENDING', workspaceId: 'ws-9' },
      1,
      20,
    );
  });

  it('listPendingDecisions org-wide is explicit opt-in (workspaceId undefined)', async () => {
    await controller.listPendingDecisions(req, undefined, '1', '20');
    expect(service.listByOrg).toHaveBeenCalledWith(
      'org-1',
      { status: 'PENDING', workspaceId: undefined },
      1,
      20,
    );
  });

  // ── Unit 5.5 — approvals DTO (real query, no longer a stub) ─────────────────

  it('listApprovals queries resolved decisions, workspace-scoped', async () => {
    await controller.listApprovals(req, 'ws-9', '1', '20');
    expect(service.listResolvedApprovals).toHaveBeenCalledWith(
      'org-1',
      { workspaceId: 'ws-9' },
      1,
      20,
    );
  });

  it('listApprovals maps a resolved row to the approval DTO (actor names + selfApproved)', async () => {
    service.listResolvedApprovals.mockResolvedValue({
      items: [
        {
          id: 'ex-1',
          exceptionType: 'CAPACITY',
          workspaceId: 'ws-9',
          status: 'APPROVED',
          reason: 'need headroom',
          requestedByUserId: 'user-req',
          resolvedByUserId: 'user-req',
          selfResolved: true,
          resolutionNote: 'ok',
          createdAt: new Date('2026-07-01T00:00:00Z'),
          updatedAt: new Date('2026-07-02T00:00:00Z'),
        },
      ],
      total: 1,
    });
    service.resolveActorNames.mockResolvedValue(new Map([['user-req', 'Ada Req']]));
    service.resolveProjectId.mockReturnValue('proj-1');

    const res: any = await controller.listApprovals(req, 'ws-9', '1', '20');
    const dto = res.data[0];
    expect(dto).toEqual(
      expect.objectContaining({
        id: 'ex-1',
        type: 'CAPACITY_EXCEPTION',
        decision: 'APPROVED',
        projectId: 'proj-1',
        requestedByName: 'Ada Req',
        resolvedByName: 'Ada Req',
        selfApproved: true,
        resolutionNote: 'ok',
      }),
    );
    expect(dto.requestedAt).toBe('2026-07-01T00:00:00.000Z');
    expect(dto.decidedAt).toBe('2026-07-02T00:00:00.000Z');
    expect(res.meta).toEqual({ total: 1, page: 1, pageSize: 20 });
  });
});
