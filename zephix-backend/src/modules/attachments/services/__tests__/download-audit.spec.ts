/**
 * Phase 3C: Download Audit Tests
 *
 * Covers: download_link audit emitted on successful download,
 * audit never stores URL fields in payload,
 * no audit emitted on blocked downloads.
 */
import { AttachmentsService } from '../attachments.service';
import { GoneException, NotFoundException } from '@nestjs/common';

describe('Download Audit', () => {
  let service: AttachmentsService;
  let mockRepo: any;
  let mockAuditService: any;

  const mockStorage = {
    getBucket: jest.fn().mockReturnValue('test-bucket'),
    getPresignedPutUrl: jest.fn().mockResolvedValue('https://s3/put-url'),
    getPresignedGetUrl: jest.fn().mockResolvedValue('https://s3/get-url?secret=xyz'),
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

  const mockEntitlementService = {
    getLimit: jest.fn().mockResolvedValue(null),
    assertWithinLimit: jest.fn().mockResolvedValue(undefined),
  };

  const adminAuth = { userId: 'u1', organizationId: 'org-1', platformRole: 'ADMIN' };
  const wsId = 'ws-1';

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepo = {
      create: jest.fn(),
      save: jest.fn((entity: any) => Promise.resolve(entity)),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
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

  it('emits download_link audit on successful download', async () => {
    mockRepo.findOne.mockResolvedValue({
      id: 'att-1',
      organizationId: 'org-1',
      workspaceId: wsId,
      status: 'uploaded',
      deletedAt: null,
      expiresAt: null,
      storageKey: 'org-1/ws-1/file.pdf',
      fileName: 'file.pdf',
      parentType: 'work_task',
      parentId: 'task-1',
      createdAt: new Date(),
    });

    await service.getDownloadUrl(adminAuth, wsId, 'att-1');

    expect(mockAuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'attachment',
        entityId: 'att-1',
        action: 'download_link',
        organizationId: 'org-1',
        workspaceId: wsId,
        actorUserId: 'u1',
      }),
    );
  });

  it('never stores URL fields in audit payload', async () => {
    mockRepo.findOne.mockResolvedValue({
      id: 'att-1',
      organizationId: 'org-1',
      workspaceId: wsId,
      status: 'uploaded',
      deletedAt: null,
      expiresAt: null,
      storageKey: 'org-1/ws-1/file.pdf',
      fileName: 'file.pdf',
      parentType: 'work_task',
      parentId: 'task-1',
      createdAt: new Date(),
    });

    await service.getDownloadUrl(adminAuth, wsId, 'att-1');

    const auditCall = mockAuditService.record.mock.calls[0][0];
    const metadata = auditCall.metadata;
    expect(metadata).not.toHaveProperty('url');
    expect(metadata).not.toHaveProperty('downloadUrl');
    expect(metadata).not.toHaveProperty('presignedUrl');
    expect(metadata).not.toHaveProperty('presignedGetUrl');
    expect(metadata).not.toHaveProperty('storageKey');
    // Should include safe identifiers only
    expect(metadata.attachmentId).toBe('att-1');
    expect(metadata.parentType).toBe('work_task');
    expect(metadata.parentId).toBe('task-1');
  });

  it('does not emit audit on expired download (410)', async () => {
    mockRepo.findOne.mockResolvedValue({
      id: 'att-1',
      organizationId: 'org-1',
      workspaceId: wsId,
      status: 'uploaded',
      deletedAt: null,
      expiresAt: new Date('2020-01-01'),
      storageKey: 'key',
      fileName: 'file.pdf',
      parentType: 'work_task',
      parentId: 'task-1',
      createdAt: new Date(),
    });

    await expect(service.getDownloadUrl(adminAuth, wsId, 'att-1')).rejects.toThrow(GoneException);
    expect(mockAuditService.record).not.toHaveBeenCalled();
  });

  it('does not emit audit on pending download (404)', async () => {
    mockRepo.findOne.mockResolvedValue({
      id: 'att-1',
      organizationId: 'org-1',
      workspaceId: wsId,
      status: 'pending',
      createdAt: new Date(),
    });

    await expect(service.getDownloadUrl(adminAuth, wsId, 'att-1')).rejects.toThrow(NotFoundException);
    expect(mockAuditService.record).not.toHaveBeenCalled();
  });

  it('does not emit audit on deleted download (404)', async () => {
    mockRepo.findOne.mockResolvedValue({
      id: 'att-1',
      organizationId: 'org-1',
      workspaceId: wsId,
      status: 'deleted',
      deletedAt: new Date(),
      createdAt: new Date(),
    });

    await expect(service.getDownloadUrl(adminAuth, wsId, 'att-1')).rejects.toThrow(NotFoundException);
    expect(mockAuditService.record).not.toHaveBeenCalled();
  });

  it('does not emit audit on not-found attachment', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    await expect(service.getDownloadUrl(adminAuth, wsId, 'att-missing')).rejects.toThrow(NotFoundException);
    expect(mockAuditService.record).not.toHaveBeenCalled();
  });
});
