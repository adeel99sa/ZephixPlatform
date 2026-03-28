/**
 * Phase 2G: Attachments Service Tests
 *
 * Covers: size limit, extension block, storageKey generation,
 * pending→uploaded transition, org/ws scoping, delete flow,
 * fileName sanitization, viewer block.
 */
import { AttachmentsService } from '../attachments.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

describe('AttachmentsService', () => {
  let service: AttachmentsService;

  const mockRepo = {
    create: jest.fn((data: any) => ({ id: 'att-1', ...data, createdAt: new Date() })),
    save: jest.fn((entity: any) => Promise.resolve(entity)),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
  };

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
    query: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
    }),
  };

  const mockEntitlementService = {
    getLimit: jest.fn().mockResolvedValue(null), // unlimited by default (enterprise)
    assertWithinLimit: jest.fn().mockResolvedValue(undefined),
  };

  const mockAuditService = {
    record: jest.fn().mockResolvedValue({ id: 'evt-1' }),
  } as any;

  const adminAuth = { userId: 'u1', organizationId: 'org-1', platformRole: 'ADMIN' };
  const viewerAuth = { userId: 'u2', organizationId: 'org-1', platformRole: 'VIEWER' };
  const wsId = 'ws-1';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AttachmentsService(
      mockRepo as any,
      mockStorageUsageRepo as any,
      mockStorage as any,
      mockAccess as any,
      mockConfig as any,
      mockEntitlementService as any,
      mockAuditService,
    );
  });

  describe('createPresign', () => {
    const validDto = {
      parentType: 'work_task' as const,
      parentId: 'task-1',
      fileName: 'report.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
    };

    it('creates pending attachment and returns presigned URL', async () => {
      const result = await service.createPresign(adminAuth, wsId, validDto);
      expect(result.presignedPutUrl).toBe('https://s3/put-url');
      expect(result.attachment.status).toBe('pending');
      expect(result.attachment.fileName).toBe('report.pdf');
    });

    it('generates server-side storageKey with org/ws/parent path', async () => {
      await service.createPresign(adminAuth, wsId, validDto);
      const createCall = mockRepo.create.mock.calls[0][0];
      expect(createCall.storageKey).toContain('org-1/ws-1/work_task/task-1/');
      expect(createCall.storageKey).toContain('report.pdf');
    });

    it('enforces max file size', async () => {
      await expect(
        service.createPresign(adminAuth, wsId, { ...validDto, sizeBytes: 100_000_000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects zero-byte files', async () => {
      await expect(
        service.createPresign(adminAuth, wsId, { ...validDto, sizeBytes: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks executable extensions', async () => {
      await expect(
        service.createPresign(adminAuth, wsId, { ...validDto, fileName: 'malware.exe' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks .bat extension', async () => {
      await expect(
        service.createPresign(adminAuth, wsId, { ...validDto, fileName: 'script.bat' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks .ps1 extension', async () => {
      await expect(
        service.createPresign(adminAuth, wsId, { ...validDto, fileName: 'run.ps1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('sanitizes path traversal in fileName', async () => {
      await service.createPresign(adminAuth, wsId, {
        ...validDto,
        fileName: '../../etc/passwd.pdf',
      });
      const createCall = mockRepo.create.mock.calls[0][0];
      expect(createCall.fileName).not.toContain('..');
      expect(createCall.fileName).not.toContain('/');
    });

    it('calls assertCanWriteParent', async () => {
      await service.createPresign(adminAuth, wsId, validDto);
      expect(mockAccess.assertCanWriteParent).toHaveBeenCalledWith(
        adminAuth, wsId, 'work_task', 'task-1',
      );
    });

    it('blocks VIEWER via access service', async () => {
      mockAccess.assertCanWriteParent.mockRejectedValueOnce(
        new ForbiddenException('Guests cannot upload'),
      );
      await expect(
        service.createPresign(viewerAuth, wsId, validDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('completeUpload', () => {
    it('transitions pending to uploaded', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: wsId,
        status: 'pending',
        parentType: 'work_task',
        parentId: 'task-1',
        createdAt: new Date(),
      });

      const result = await service.completeUpload(adminAuth, wsId, 'att-1', 'abc123');
      expect(result.status).toBe('uploaded');
    });

    it('rejects if already uploaded', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: wsId,
        status: 'uploaded',
        parentType: 'work_task',
        parentId: 'task-1',
        createdAt: new Date(),
      });

      await expect(
        service.completeUpload(adminAuth, wsId, 'att-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when attachment not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(
        service.completeUpload(adminAuth, wsId, 'att-missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listForParent', () => {
    it('returns only uploaded non-deleted attachments', async () => {
      mockRepo.find.mockResolvedValue([
        { id: 'att-1', status: 'uploaded', createdAt: new Date() },
      ]);
      const result = await service.listForParent(adminAuth, wsId, 'work_task', 'task-1');
      expect(result).toHaveLength(1);
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'uploaded',
            deletedAt: null,
          }),
        }),
      );
    });

    it('scopes by org and workspace', async () => {
      await service.listForParent(adminAuth, wsId, 'work_task', 'task-1');
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
            workspaceId: wsId,
          }),
        }),
      );
    });
  });

  describe('getDownloadUrl', () => {
    it('returns presigned GET URL', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: wsId,
        storageKey: 'org-1/ws-1/work_task/task-1/file.pdf',
        fileName: 'file.pdf',
        parentType: 'work_task',
        parentId: 'task-1',
        createdAt: new Date(),
      });

      const result = await service.getDownloadUrl(adminAuth, wsId, 'att-1');
      expect(result.downloadUrl).toBe('https://s3/get-url');
    });
  });

  describe('deleteAttachment', () => {
    it('soft deletes and calls storage cleanup', async () => {
      const att = {
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: wsId,
        storageKey: 'key',
        parentType: 'work_task',
        parentId: 'task-1',
        status: 'uploaded',
        deletedAt: null,
        createdAt: new Date(),
      };
      mockRepo.findOne.mockResolvedValue(att);

      await service.deleteAttachment(adminAuth, wsId, 'att-1');
      expect(att.status).toBe('deleted');
      expect(att.deletedAt).toBeInstanceOf(Date);
      expect(mockStorage.deleteObject).toHaveBeenCalledWith('key');
    });
  });
});
