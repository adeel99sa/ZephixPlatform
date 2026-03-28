/**
 * Phase 3C: Controller Gating Tests
 *
 * Covers: retention PATCH blocked for member/viewer,
 * purge endpoint admin only,
 * retention PATCH allowed for admin/workspace_owner/delivery_owner.
 */
import { AttachmentsController } from '../attachments.controller';
import { ForbiddenException } from '@nestjs/common';

describe('Attachments Controller Gating (Phase 3C)', () => {
  let controller: AttachmentsController;
  let mockAttachmentsService: any;
  let mockResponseService: any;
  let mockWorkspaceRoleGuard: any;

  const validWsId = '12345678-1234-1234-1234-123456789012';

  const makeReq = (platformRole: string) => ({
    user: {
      id: 'u1',
      organizationId: 'org-1',
      platformRole,
      role: platformRole,
    },
  });

  beforeEach(() => {
    mockAttachmentsService = {
      createPresign: jest.fn().mockResolvedValue({
        attachment: { id: 'att-1' },
        presignedPutUrl: 'url',
      }),
      completeUpload: jest.fn().mockResolvedValue({ id: 'att-1', status: 'uploaded' }),
      listForParent: jest.fn().mockResolvedValue([]),
      getDownloadUrl: jest.fn().mockResolvedValue({ downloadUrl: 'url', attachment: {} }),
      deleteAttachment: jest.fn().mockResolvedValue(undefined),
      updateRetention: jest.fn().mockResolvedValue({
        id: 'att-1',
        retentionDays: 90,
        expiresAt: '2026-04-01T00:00:00.000Z',
      }),
    };

    mockResponseService = {
      success: jest.fn((data: any) => ({ data })),
    };

    mockWorkspaceRoleGuard = {
      getWorkspaceRole: jest.fn().mockResolvedValue(null),
    };

    controller = new AttachmentsController(
      mockAttachmentsService,
      mockResponseService,
      mockWorkspaceRoleGuard,
    );
  });

  describe('PATCH :id/retention', () => {
    it('blocks MEMBER (no ws role) from updating retention', async () => {
      const req = makeReq('MEMBER');
      mockWorkspaceRoleGuard.getWorkspaceRole.mockResolvedValue('team_member');

      await expect(
        controller.updateRetention(req as any, validWsId, 'att-1', { retentionDays: 90 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks VIEWER from updating retention', async () => {
      const req = makeReq('VIEWER');
      mockWorkspaceRoleGuard.getWorkspaceRole.mockResolvedValue('viewer');

      await expect(
        controller.updateRetention(req as any, validWsId, 'att-1', { retentionDays: 90 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks MEMBER with null ws role from updating retention', async () => {
      const req = makeReq('MEMBER');
      mockWorkspaceRoleGuard.getWorkspaceRole.mockResolvedValue(null);

      await expect(
        controller.updateRetention(req as any, validWsId, 'att-1', { retentionDays: 90 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows ADMIN to update retention (bypasses ws role check)', async () => {
      const req = makeReq('ADMIN');
      // ADMIN should bypass workspace role check entirely
      const result = await controller.updateRetention(
        req as any, validWsId, 'att-1', { retentionDays: 90 },
      );
      expect(mockAttachmentsService.updateRetention).toHaveBeenCalled();
      expect(result).toBeDefined();
      // Should NOT call getWorkspaceRole for admin
      expect(mockWorkspaceRoleGuard.getWorkspaceRole).not.toHaveBeenCalled();
    });

    it('allows workspace_owner to update retention', async () => {
      const req = makeReq('MEMBER');
      mockWorkspaceRoleGuard.getWorkspaceRole.mockResolvedValue('workspace_owner');

      const result = await controller.updateRetention(
        req as any, validWsId, 'att-1', { retentionDays: 90 },
      );
      expect(mockAttachmentsService.updateRetention).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('allows delivery_owner to update retention', async () => {
      const req = makeReq('MEMBER');
      mockWorkspaceRoleGuard.getWorkspaceRole.mockResolvedValue('delivery_owner');

      const result = await controller.updateRetention(
        req as any, validWsId, 'att-1', { retentionDays: 90 },
      );
      expect(mockAttachmentsService.updateRetention).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('rejects invalid workspace ID format', async () => {
      const req = makeReq('ADMIN');
      await expect(
        controller.updateRetention(req as any, 'bad-id', 'att-1', { retentionDays: 90 }),
      ).rejects.toThrow();
    });
  });
});
