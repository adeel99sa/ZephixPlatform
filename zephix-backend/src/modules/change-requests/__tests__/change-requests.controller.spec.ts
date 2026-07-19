import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ChangeRequestsController } from '../controllers/change-requests.controller';
import { ChangeRequestsService } from '../services/change-requests.service';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import { AuthRequest } from '../../../common/http/auth-request';

/**
 * DOC-TENANT-1 sweep regression: the change-requests service reads/writes by
 * (workspaceId, projectId) with NO org filter across all 9 routes. Every route
 * MUST verify workspace membership first. These tests assert the guard runs on
 * every route and that a rejection 403s BEFORE the service. The old controller
 * had JwtAuthGuard only — no membership check anywhere.
 *
 * Read/get use requireWorkspaceRead; content mutations (create/update/delete)
 * use requireWorkspaceTaskWrite; state transitions (submit/approve/reject/
 * implement) require membership (read) — the approval-role authority stays in
 * the service (SOD-PORT-1 layers SoD separately).
 */
describe('ChangeRequestsController (DOC-TENANT-1 access control)', () => {
  let controller: ChangeRequestsController;
  let service: jest.Mocked<ChangeRequestsService>;
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
      list: jest.fn().mockResolvedValue([]),
      get: jest.fn().mockResolvedValue({ id: 'cr-1' }),
      create: jest.fn().mockResolvedValue({ id: 'cr-1' }),
      update: jest.fn().mockResolvedValue({ id: 'cr-1' }),
      submit: jest.fn().mockResolvedValue({ id: 'cr-1' }),
      approve: jest.fn().mockResolvedValue({ id: 'cr-1' }),
      reject: jest.fn().mockResolvedValue({ id: 'cr-1' }),
      implement: jest.fn().mockResolvedValue({ id: 'cr-1' }),
      remove: jest.fn().mockResolvedValue({ deleted: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChangeRequestsController],
      providers: [
        { provide: ChangeRequestsService, useValue: serviceMock },
        { provide: WorkspaceRoleGuardService, useValue: guard },
      ],
    }).compile();

    controller = module.get(ChangeRequestsController);
    service = module.get(ChangeRequestsService);
  });

  describe('read routes require membership (requireWorkspaceRead)', () => {
    it('list', async () => {
      await controller.list(wsId, projId, req);
      expect(guard.requireWorkspaceRead).toHaveBeenCalledWith(wsId, userId);
      expect(service.list).toHaveBeenCalled();
    });
    it('get', async () => {
      await controller.get(wsId, projId, 'cr-1', req);
      expect(guard.requireWorkspaceRead).toHaveBeenCalledWith(wsId, userId);
      expect(service.get).toHaveBeenCalled();
    });
  });

  describe('content mutations require task-write', () => {
    it('create', async () => {
      await controller.create(wsId, projId, { title: 'x' } as any, req);
      expect(guard.requireWorkspaceTaskWrite).toHaveBeenCalledWith(wsId, userId);
      expect(service.create).toHaveBeenCalled();
    });
    it('update', async () => {
      await controller.update(wsId, projId, 'cr-1', {} as any, req);
      expect(guard.requireWorkspaceTaskWrite).toHaveBeenCalledWith(wsId, userId);
      expect(service.update).toHaveBeenCalled();
    });
    it('remove', async () => {
      await controller.remove(wsId, projId, 'cr-1', req);
      expect(guard.requireWorkspaceTaskWrite).toHaveBeenCalledWith(wsId, userId);
      expect(service.remove).toHaveBeenCalled();
    });
  });

  describe('state transitions require membership (requireWorkspaceRead)', () => {
    it('submit', async () => {
      await controller.submit(wsId, projId, 'cr-1', req);
      expect(guard.requireWorkspaceRead).toHaveBeenCalledWith(wsId, userId);
      expect(service.submit).toHaveBeenCalled();
    });
    it('approve', async () => {
      await controller.approve(wsId, projId, 'cr-1', req);
      expect(guard.requireWorkspaceRead).toHaveBeenCalledWith(wsId, userId);
      expect(service.approve).toHaveBeenCalled();
    });
    it('reject', async () => {
      await controller.reject(wsId, projId, 'cr-1', { note: 'no' } as any, req);
      expect(guard.requireWorkspaceRead).toHaveBeenCalledWith(wsId, userId);
      expect(service.reject).toHaveBeenCalled();
    });
    it('implement', async () => {
      await controller.implement(wsId, projId, 'cr-1', req);
      expect(guard.requireWorkspaceRead).toHaveBeenCalledWith(wsId, userId);
      expect(service.implement).toHaveBeenCalled();
    });
  });

  describe('cross-org: guard rejection blocks the service (403, not empty)', () => {
    it('read rejection blocks list', async () => {
      guard.requireWorkspaceRead.mockRejectedValueOnce(
        new ForbiddenException({ code: 'FORBIDDEN_ROLE' }),
      );
      await expect(controller.list(wsId, projId, req)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(service.list).not.toHaveBeenCalled();
    });
    it('write rejection blocks create', async () => {
      guard.requireWorkspaceTaskWrite.mockRejectedValueOnce(
        new ForbiddenException({ code: 'FORBIDDEN_ROLE' }),
      );
      await expect(
        controller.create(wsId, projId, {} as any, req),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(service.create).not.toHaveBeenCalled();
    });
    it('read rejection blocks approve', async () => {
      guard.requireWorkspaceRead.mockRejectedValueOnce(
        new ForbiddenException({ code: 'FORBIDDEN_ROLE' }),
      );
      await expect(
        controller.approve(wsId, projId, 'cr-1', req),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(service.approve).not.toHaveBeenCalled();
    });
  });
});
