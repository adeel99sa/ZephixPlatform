import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ProjectBudgetsController } from '../controllers/project-budgets.controller';
import { ProjectBudgetsService } from '../services/project-budgets.service';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import { AuthRequest } from '../../../common/http/auth-request';

/**
 * DOC-TENANT-1 sweep regression: the budget service reads/writes by
 * (workspaceId, projectId) with NO org filter. Every route MUST verify
 * workspace membership first, or a caller in org A reaches org B's budget by
 * supplying it in the path. These tests assert the guard runs on every route
 * and that a rejection 403s BEFORE the service — the old controller called no
 * membership guard at all.
 */
describe('ProjectBudgetsController (DOC-TENANT-1 access control)', () => {
  let controller: ProjectBudgetsController;
  let service: jest.Mocked<ProjectBudgetsService>;
  let guard: {
    requireWorkspaceRead: jest.Mock;
    requireWorkspaceTaskWrite: jest.Mock;
  };

  const wsId = 'ws-A';
  const projId = 'proj-A';
  const userId = 'user-1';
  const req = {
    user: {
      id: userId,
      email: 'u@example.com',
      organizationId: 'org-A',
      platformRole: 'MEMBER',
    },
  } as unknown as AuthRequest;

  beforeEach(async () => {
    guard = {
      requireWorkspaceRead: jest.fn().mockResolvedValue(undefined),
      requireWorkspaceTaskWrite: jest.fn().mockResolvedValue(undefined),
    };
    const serviceMock = {
      get: jest.fn().mockResolvedValue({ id: 'b-1' }),
      update: jest.fn().mockResolvedValue({ id: 'b-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectBudgetsController],
      providers: [
        { provide: ProjectBudgetsService, useValue: serviceMock },
        { provide: WorkspaceRoleGuardService, useValue: guard },
      ],
    }).compile();

    controller = module.get(ProjectBudgetsController);
    service = module.get(ProjectBudgetsService);
  });

  it('GET checks requireWorkspaceRead before reading', async () => {
    await controller.get(wsId, projId, req);
    expect(guard.requireWorkspaceRead).toHaveBeenCalledWith(wsId, userId);
    expect(service.get).toHaveBeenCalledWith(wsId, projId);
  });

  it('PATCH checks requireWorkspaceTaskWrite before writing', async () => {
    await controller.update(wsId, projId, { revisedBudget: 100 } as any, req);
    expect(guard.requireWorkspaceTaskWrite).toHaveBeenCalledWith(wsId, userId);
    expect(service.update).toHaveBeenCalled();
  });

  it('cross-org GET: guard rejects -> service never runs (403, not empty 200)', async () => {
    guard.requireWorkspaceRead.mockRejectedValueOnce(
      new ForbiddenException({ code: 'FORBIDDEN_ROLE' }),
    );
    await expect(controller.get(wsId, projId, req)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(service.get).not.toHaveBeenCalled();
  });

  it('cross-org PATCH: guard rejects -> service never runs (403, not silent write)', async () => {
    guard.requireWorkspaceTaskWrite.mockRejectedValueOnce(
      new ForbiddenException({ code: 'FORBIDDEN_ROLE' }),
    );
    await expect(
      controller.update(wsId, projId, {} as any, req),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.update).not.toHaveBeenCalled();
  });
});
