/**
 * Phase 2G: Attachment Access Service Tests
 *
 * Covers: VIEWER block on write, MEMBER write via workspace guard,
 * ADMIN bypass, task scope verification, cross-org isolation.
 */
import { AttachmentAccessService } from '../attachment-access.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('AttachmentAccessService', () => {
  let service: AttachmentAccessService;
  const mockTaskRepo = { findOne: jest.fn() };
  const mockWsGuard = {
    requireWorkspaceRead: jest.fn().mockResolvedValue(undefined),
    requireWorkspaceWrite: jest.fn().mockResolvedValue(undefined),
  };

  const orgId = 'org-1';
  const wsId = 'ws-1';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AttachmentAccessService(mockTaskRepo as any, mockWsGuard as any);
  });

  describe('assertCanReadParent', () => {
    it('allows VIEWER with workspace read', async () => {
      mockTaskRepo.findOne.mockResolvedValue({ id: 't1', workspaceId: wsId });
      await expect(
        service.assertCanReadParent(
          { userId: 'u1', organizationId: orgId, platformRole: 'VIEWER' },
          wsId, 'work_task', 't1',
        ),
      ).resolves.not.toThrow();
    });

    it('calls requireWorkspaceRead', async () => {
      await service.assertCanReadParent(
        { userId: 'u1', organizationId: orgId, platformRole: 'MEMBER' },
        wsId, 'doc', 'd1',
      );
      expect(mockWsGuard.requireWorkspaceRead).toHaveBeenCalledWith(wsId, 'u1');
    });

    it('verifies task scope for work_task parent', async () => {
      mockTaskRepo.findOne.mockResolvedValue({ id: 't1', workspaceId: wsId });
      await service.assertCanReadParent(
        { userId: 'u1', organizationId: orgId, platformRole: 'MEMBER' },
        wsId, 'work_task', 't1',
      );
      expect(mockTaskRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 't1',
            organizationId: orgId,
            workspaceId: wsId,
          }),
        }),
      );
    });

    it('throws NotFoundException when task not found', async () => {
      mockTaskRepo.findOne.mockResolvedValue(null);
      await expect(
        service.assertCanReadParent(
          { userId: 'u1', organizationId: orgId, platformRole: 'MEMBER' },
          wsId, 'work_task', 't-missing',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('denies read when parent task belongs to a different workspace', async () => {
      mockTaskRepo.findOne.mockResolvedValue(null);

      const err = await service
        .assertCanReadParent(
          { userId: 'u1', organizationId: orgId, platformRole: 'MEMBER' },
          wsId,
          'work_task',
          't-foreign-workspace',
        )
        .then(() => null, (e) => e);

      expect(err).toBeInstanceOf(NotFoundException);
      expect(err.response).toMatchObject({
        code: 'TASK_NOT_FOUND',
      });
    });

    it('denies read for cross-organization parent task', async () => {
      mockTaskRepo.findOne.mockResolvedValue(null);

      const err = await service
        .assertCanReadParent(
          { userId: 'u1', organizationId: 'org-2', platformRole: 'MEMBER' },
          wsId,
          'work_task',
          't-org-1',
        )
        .then(() => null, (e) => e);

      expect(err).toBeInstanceOf(NotFoundException);
      expect(err.response).toMatchObject({
        code: 'TASK_NOT_FOUND',
      });
    });

    it('denies read for invalid parent task id', async () => {
      mockTaskRepo.findOne.mockResolvedValue(null);

      const err = await service
        .assertCanReadParent(
          { userId: 'u1', organizationId: orgId, platformRole: 'MEMBER' },
          wsId,
          'work_task',
          'nonexistent-task-id',
        )
        .then(() => null, (e) => e);

      expect(err).toBeInstanceOf(NotFoundException);
      expect(err.response).toMatchObject({
        code: 'TASK_NOT_FOUND',
      });
    });
  });

  describe('assertCanWriteParent', () => {
    it('blocks VIEWER from all write operations', async () => {
      await expect(
        service.assertCanWriteParent(
          { userId: 'u1', organizationId: orgId, platformRole: 'VIEWER' },
          wsId, 'work_task', 't1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows ADMIN without workspace write check', async () => {
      mockTaskRepo.findOne.mockResolvedValue({ id: 't1', workspaceId: wsId });
      await expect(
        service.assertCanWriteParent(
          { userId: 'u1', organizationId: orgId, platformRole: 'ADMIN' },
          wsId, 'work_task', 't1',
        ),
      ).resolves.not.toThrow();
      expect(mockWsGuard.requireWorkspaceWrite).not.toHaveBeenCalled();
    });

    it('requires workspace write for MEMBER', async () => {
      await service.assertCanWriteParent(
        { userId: 'u1', organizationId: orgId, platformRole: 'MEMBER' },
        wsId, 'doc', 'd1',
      );
      expect(mockWsGuard.requireWorkspaceWrite).toHaveBeenCalledWith(wsId, 'u1');
    });

    it('throws when workspace write check fails for MEMBER', async () => {
      mockWsGuard.requireWorkspaceWrite.mockRejectedValueOnce(
        new ForbiddenException('Read only access'),
      );
      await expect(
        service.assertCanWriteParent(
          { userId: 'u1', organizationId: orgId, platformRole: 'MEMBER' },
          wsId, 'work_task', 't1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
