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
    resolvePendingDecisionContext: jest.Mock;
    resolveProjectId: jest.Mock;
  };

  const req = {
    user: { id: 'u-1', email: 'a@b.c', organizationId: 'org-1', platformRole: 'ADMIN' },
  } as unknown as AuthRequest;

  beforeEach(async () => {
    service = {
      getHealth: jest.fn().mockResolvedValue({ scope: 'workspace' }),
      listByOrg: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      resolvePendingDecisionContext: jest
        .fn()
        .mockResolvedValue({ workspaceNames: new Map(), projectNames: new Map() }),
      resolveProjectId: jest.fn().mockReturnValue(null),
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
});
