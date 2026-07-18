import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { DocumentsController } from '../controllers/documents.controller';
import { DocumentsService } from '../services/documents.service';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import { AuthRequest } from '../../../common/http/auth-request';

/**
 * DOC-TENANT-1 regression: every route MUST verify workspace membership before
 * touching documents. The original controller carried JwtAuthGuard only and
 * never called a membership guard, so a caller in org A could read/write org
 * B's documents. These tests assert the guard is invoked on every route and
 * that a rejection (non-member / cross-org workspace) 403s BEFORE the service
 * runs — not an empty 200.
 */
describe('DocumentsController (DOC-TENANT-1 access control)', () => {
  let controller: DocumentsController;
  let service: jest.Mocked<DocumentsService>;
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
      get: jest.fn().mockResolvedValue({ id: 'doc-1' }),
      create: jest.fn().mockResolvedValue({ id: 'doc-1' }),
      update: jest.fn().mockResolvedValue({ id: 'doc-1' }),
      remove: jest.fn().mockResolvedValue({ deleted: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        { provide: DocumentsService, useValue: serviceMock },
        { provide: WorkspaceRoleGuardService, useValue: guard },
      ],
    }).compile();

    controller = module.get(DocumentsController);
    service = module.get(DocumentsService);
  });

  describe('read routes require workspace membership', () => {
    it('list checks requireWorkspaceRead before listing', async () => {
      await controller.list(wsId, projId, req);
      expect(guard.requireWorkspaceRead).toHaveBeenCalledWith(wsId, userId);
      expect(service.list).toHaveBeenCalledWith(wsId, projId);
    });

    it('get checks requireWorkspaceRead before fetching', async () => {
      await controller.get(wsId, projId, 'doc-1', req);
      expect(guard.requireWorkspaceRead).toHaveBeenCalledWith(wsId, userId);
      expect(service.get).toHaveBeenCalled();
    });

    it('cross-org read: guard rejects -> service never runs (403, not empty 200)', async () => {
      guard.requireWorkspaceRead.mockRejectedValueOnce(
        new ForbiddenException({ code: 'FORBIDDEN_ROLE' }),
      );
      await expect(controller.list(wsId, projId, req)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(service.list).not.toHaveBeenCalled();
    });
  });

  describe('write routes require task-write membership', () => {
    it('create checks requireWorkspaceTaskWrite before creating', async () => {
      await controller.create(wsId, projId, { title: 'x' }, req);
      expect(guard.requireWorkspaceTaskWrite).toHaveBeenCalledWith(
        wsId,
        userId,
      );
      expect(service.create).toHaveBeenCalled();
    });

    it('update checks requireWorkspaceTaskWrite before updating', async () => {
      await controller.update(wsId, projId, 'doc-1', { title: 'x' }, req);
      expect(guard.requireWorkspaceTaskWrite).toHaveBeenCalledWith(
        wsId,
        userId,
      );
      expect(service.update).toHaveBeenCalled();
    });

    it('remove checks requireWorkspaceTaskWrite before deleting', async () => {
      await controller.remove(wsId, projId, 'doc-1', req);
      expect(guard.requireWorkspaceTaskWrite).toHaveBeenCalledWith(
        wsId,
        userId,
      );
      expect(service.remove).toHaveBeenCalled();
    });

    it.each([
      ['create', () => controller.create(wsId, projId, { title: 'x' }, req), 'create'],
      ['update', () => controller.update(wsId, projId, 'doc-1', { title: 'x' }, req), 'update'],
      ['remove', () => controller.remove(wsId, projId, 'doc-1', req), 'remove'],
    ])(
      'cross-org %s: guard rejects -> service never runs (403, not empty write)',
      async (_name, call, method) => {
        guard.requireWorkspaceTaskWrite.mockRejectedValueOnce(
          new ForbiddenException({ code: 'FORBIDDEN_ROLE' }),
        );
        await expect(call()).rejects.toBeInstanceOf(ForbiddenException);
        expect(service[method as 'create' | 'update' | 'remove']).not.toHaveBeenCalled();
      },
    );
  });
});
