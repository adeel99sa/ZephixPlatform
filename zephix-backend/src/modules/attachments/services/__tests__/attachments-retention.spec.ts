/**
 * Phase 3C: Attachment Retention Tests
 *
 * Covers: retention assignment on complete, retention override,
 * expired download blocked (410), pending download blocked (404),
 * deleted download blocked (404), enterprise plan sets null expiry.
 */
import { AttachmentsService } from '../attachments.service';
import { BadRequestException, NotFoundException, GoneException } from '@nestjs/common';

describe('Attachment Retention', () => {
  let service: AttachmentsService;
  let mockRepo: any;
  let mockEntitlementService: any;
  let mockAuditService: any;

  const mockStorage = {
    getBucket: jest.fn().mockReturnValue('test-bucket'),
    getPresignedPutUrl: jest.fn().mockResolvedValue('https://s3/put-url'),
    getPresignedGetUrl: jest.fn().mockResolvedValue('https://s3/get-url'),
    deleteObject: jest.fn().mockResolvedValue(undefined),
  };

  const mockAccess = {
    assertCanReadParent: jest.fn().mockResolvedValue(undefined),
    assertCanWriteParent: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfig = {
    get: jest.fn().mockReturnValue('52428800'),
  };

  const mockStorageUsageRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    query: jest.fn().mockResolvedValue([{ total: '0' }]),
  };

  const adminAuth = { userId: 'u1', organizationId: 'org-1', platformRole: 'ADMIN' };
  const wsId = 'ws-1';

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepo = {
      create: jest.fn((data: any) => ({ id: 'att-1', ...data, createdAt: new Date() })),
      save: jest.fn((entity: any) => Promise.resolve(entity)),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };

    mockEntitlementService = {
      getLimit: jest.fn().mockResolvedValue(null),
      assertWithinLimit: jest.fn().mockResolvedValue(undefined),
    };

    mockAuditService = {
      record: jest.fn().mockResolvedValue({ id: 'evt-1' }),
    };

    service = new AttachmentsService(
      mockRepo as any,
      mockStorageUsageRepo as any,
      mockStorage as any,
      mockAccess as any,
      mockConfig as any,
      mockEntitlementService as any,
      mockAuditService as any,
    );
  });

  describe('completeUpload sets retention from plan', () => {
    it('sets expires_at for free plan (30 days retention)', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: wsId,
        status: 'pending',
        sizeBytes: 1024,
        parentType: 'work_task',
        parentId: 'task-1',
        createdAt: new Date(),
      });

      // Simulate free plan: 30 days retention
      mockEntitlementService.getLimit.mockResolvedValue(30);

      await service.completeUpload(adminAuth, wsId, 'att-1');

      const savedEntity = mockRepo.save.mock.calls[0][0];
      expect(savedEntity.retentionDays).toBe(30);
      expect(savedEntity.expiresAt).toBeInstanceOf(Date);

      // Verify it's approximately 30 days in the future
      const diffMs = savedEntity.expiresAt.getTime() - savedEntity.uploadedAt.getTime();
      const diffDays = diffMs / (24 * 60 * 60 * 1000);
      expect(diffDays).toBeCloseTo(30, 0);
    });

    it('sets null expires_at for enterprise plan', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'att-2',
        organizationId: 'org-1',
        workspaceId: wsId,
        status: 'pending',
        sizeBytes: 1024,
        parentType: 'work_task',
        parentId: 'task-1',
        createdAt: new Date(),
      });

      // Enterprise: null retention = no expiry
      mockEntitlementService.getLimit.mockResolvedValue(null);

      await service.completeUpload(adminAuth, wsId, 'att-2');

      const savedEntity = mockRepo.save.mock.calls[0][0];
      expect(savedEntity.retentionDays).toBeNull();
      expect(savedEntity.expiresAt).toBeNull();
    });

    it('sets 180 days retention for team plan', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'att-3',
        organizationId: 'org-1',
        workspaceId: wsId,
        status: 'pending',
        sizeBytes: 1024,
        parentType: 'work_task',
        parentId: 'task-1',
        createdAt: new Date(),
      });

      mockEntitlementService.getLimit.mockResolvedValue(180);

      await service.completeUpload(adminAuth, wsId, 'att-3');

      const savedEntity = mockRepo.save.mock.calls[0][0];
      expect(savedEntity.retentionDays).toBe(180);
      expect(savedEntity.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('updateRetention', () => {
    it('overrides retention days and recomputes expires_at', async () => {
      const uploadedAt = new Date('2026-01-01T00:00:00Z');
      mockRepo.findOne.mockResolvedValue({
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: wsId,
        status: 'uploaded',
        sizeBytes: 1024,
        uploadedAt,
        retentionDays: 30,
        expiresAt: new Date('2026-01-31T00:00:00Z'),
        parentType: 'work_task',
        parentId: 'task-1',
        deletedAt: null,
        createdAt: new Date(),
      });

      const result = await service.updateRetention(adminAuth, wsId, 'att-1', 90);
      expect(result.retentionDays).toBe(90);
      const expectedExpires = new Date(uploadedAt.getTime() + 90 * 24 * 60 * 60 * 1000);
      expect(result.expiresAt).toBe(expectedExpires.toISOString());
    });

    it('clears expiry when retentionDays is null', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: wsId,
        status: 'uploaded',
        sizeBytes: 1024,
        uploadedAt: new Date('2026-01-01T00:00:00Z'),
        retentionDays: 30,
        expiresAt: new Date('2026-01-31T00:00:00Z'),
        parentType: 'work_task',
        parentId: 'task-1',
        deletedAt: null,
        createdAt: new Date(),
      });

      const result = await service.updateRetention(adminAuth, wsId, 'att-1', null);
      expect(result.retentionDays).toBeNull();
      expect(result.expiresAt).toBeNull();
    });

    it('emits audit event with old and new retention', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: wsId,
        status: 'uploaded',
        sizeBytes: 1024,
        uploadedAt: new Date('2026-01-01T00:00:00Z'),
        retentionDays: 30,
        expiresAt: new Date('2026-01-31T00:00:00Z'),
        parentType: 'work_task',
        parentId: 'task-1',
        deletedAt: null,
        createdAt: new Date(),
      });

      await service.updateRetention(adminAuth, wsId, 'att-1', 90);

      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
          entityType: 'attachment',
          metadata: expect.objectContaining({
            oldRetentionDays: 30,
            newRetentionDays: 90,
          }),
        }),
      );
    });

    it('rejects retention on non-uploaded attachment', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: wsId,
        status: 'pending',
        deletedAt: null,
        createdAt: new Date(),
      });

      await expect(
        service.updateRetention(adminAuth, wsId, 'att-1', 60),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects retentionDays outside 1-3650 range', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: wsId,
        status: 'uploaded',
        deletedAt: null,
        createdAt: new Date(),
      });

      await expect(
        service.updateRetention(adminAuth, wsId, 'att-1', 0),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateRetention(adminAuth, wsId, 'att-1', 4000),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getDownloadUrl blocks expired/pending/deleted', () => {
    it('blocks download for pending attachment with 404', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: wsId,
        status: 'pending',
        parentType: 'work_task',
        parentId: 'task-1',
        createdAt: new Date(),
      });

      await expect(
        service.getDownloadUrl(adminAuth, wsId, 'att-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('blocks download for deleted attachment with 404', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: wsId,
        status: 'deleted',
        deletedAt: new Date(),
        parentType: 'work_task',
        parentId: 'task-1',
        createdAt: new Date(),
      });

      await expect(
        service.getDownloadUrl(adminAuth, wsId, 'att-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('blocks download for expired attachment with 410 GONE', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: wsId,
        status: 'uploaded',
        deletedAt: null,
        expiresAt: new Date('2020-01-01'), // expired
        storageKey: 'key',
        fileName: 'file.pdf',
        parentType: 'work_task',
        parentId: 'task-1',
        createdAt: new Date(),
      });

      await expect(
        service.getDownloadUrl(adminAuth, wsId, 'att-1'),
      ).rejects.toThrow(GoneException);
    });

    it('allows download for uploaded non-expired attachment', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: wsId,
        status: 'uploaded',
        deletedAt: null,
        expiresAt: new Date('2030-01-01'), // future
        storageKey: 'key',
        fileName: 'file.pdf',
        parentType: 'work_task',
        parentId: 'task-1',
        createdAt: new Date(),
      });

      const result = await service.getDownloadUrl(adminAuth, wsId, 'att-1');
      expect(result.downloadUrl).toBe('https://s3/get-url');
    });

    it('updates last_downloaded_at on successful download', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: wsId,
        status: 'uploaded',
        deletedAt: null,
        expiresAt: null,
        storageKey: 'key',
        fileName: 'file.pdf',
        parentType: 'work_task',
        parentId: 'task-1',
        createdAt: new Date(),
      });

      await service.getDownloadUrl(adminAuth, wsId, 'att-1');

      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'att-1' },
        { lastDownloadedAt: expect.any(Date) },
      );
    });
  });
});
