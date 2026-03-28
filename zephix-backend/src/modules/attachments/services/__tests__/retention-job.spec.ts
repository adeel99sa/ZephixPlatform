/**
 * Phase 3C: Retention Cleanup Job Tests
 *
 * Covers: purgeExpired finds and deletes expired attachments,
 * decrements used_bytes, emits audit with source retention_job,
 * calls storage delete, handles errors gracefully.
 */
import { AttachmentsService } from '../attachments.service';

describe('Retention Cleanup Job (purgeExpired)', () => {
  let service: AttachmentsService;
  let mockRepo: any;
  let mockStorageUsageRepo: any;
  let mockStorage: any;
  let mockAuditService: any;

  const mockAccess = {
    assertCanReadParent: jest.fn().mockResolvedValue(undefined),
    assertCanWriteParent: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfig = {
    get: jest.fn().mockReturnValue('52428800'),
  };

  const mockEntitlementService = {
    getLimit: jest.fn().mockResolvedValue(null),
    assertWithinLimit: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepo = {
      create: jest.fn(),
      save: jest.fn((entity: any) => Promise.resolve(entity)),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    mockStorageUsageRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      query: jest.fn().mockResolvedValue([{ total: '0' }]),
    };

    mockStorage = {
      getBucket: jest.fn().mockReturnValue('test-bucket'),
      getPresignedPutUrl: jest.fn().mockResolvedValue('https://s3/put-url'),
      getPresignedGetUrl: jest.fn().mockResolvedValue('https://s3/get-url'),
      deleteObject: jest.fn().mockResolvedValue(undefined),
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

  it('purges expired attachments and decrements used_bytes', async () => {
    const expired = [
      {
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        status: 'uploaded',
        sizeBytes: 1000,
        storageKey: 'key-1',
        retentionDays: 30,
        expiresAt: new Date('2020-01-01'),
        deletedAt: null,
        fileName: 'old.pdf',
      },
      {
        id: 'att-2',
        organizationId: 'org-1',
        workspaceId: 'ws-2',
        status: 'uploaded',
        sizeBytes: 2000,
        storageKey: 'key-2',
        retentionDays: 30,
        expiresAt: new Date('2020-06-01'),
        deletedAt: null,
        fileName: 'older.pdf',
      },
    ];

    mockRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(expired),
    });

    const result = await service.purgeExpired(500);

    expect(result.purged).toBe(2);

    // Verify both attachments marked as deleted
    expect(mockRepo.save).toHaveBeenCalledTimes(2);
    expect(expired[0].status).toBe('deleted');
    expect(expired[0].deletedAt).toBeInstanceOf(Date);
    expect(expired[1].status).toBe('deleted');

    // Verify storage usage decremented for each
    const decrementCalls = mockStorageUsageRepo.query.mock.calls.filter(
      (c: any[]) => c[0].includes('used_bytes = GREATEST(0, used_bytes -'),
    );
    expect(decrementCalls.length).toBe(2);
    expect(decrementCalls[0][1]).toEqual(['org-1', 'ws-1', 1000]);
    expect(decrementCalls[1][1]).toEqual(['org-1', 'ws-2', 2000]);
  });

  it('emits audit delete with source retention_job', async () => {
    const expired = [
      {
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        status: 'uploaded',
        sizeBytes: 1000,
        storageKey: 'key-1',
        retentionDays: 30,
        expiresAt: new Date('2020-01-01'),
        deletedAt: null,
        fileName: 'old.pdf',
      },
    ];

    mockRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(expired),
    });

    await service.purgeExpired();

    expect(mockAuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'attachment',
        action: 'delete',
        actorPlatformRole: 'ADMIN',
        metadata: expect.objectContaining({
          source: 'retention_job',
          retentionDays: 30,
          fileName: 'old.pdf',
          sizeBytes: 1000,
        }),
      }),
    );
  });

  it('calls storage deleteObject for each expired attachment', async () => {
    const expired = [
      {
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        status: 'uploaded',
        sizeBytes: 500,
        storageKey: 'org-1/ws-1/file.pdf',
        retentionDays: 30,
        expiresAt: new Date('2020-01-01'),
        deletedAt: null,
        fileName: 'file.pdf',
      },
    ];

    mockRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(expired),
    });

    await service.purgeExpired();

    expect(mockStorage.deleteObject).toHaveBeenCalledWith('org-1/ws-1/file.pdf');
  });

  it('returns 0 purged when no expired attachments', async () => {
    const result = await service.purgeExpired();
    expect(result.purged).toBe(0);
  });

  it('continues processing when individual item fails', async () => {
    const expired = [
      {
        id: 'att-fail',
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        status: 'uploaded',
        sizeBytes: 500,
        storageKey: 'key-fail',
        retentionDays: 30,
        expiresAt: new Date('2020-01-01'),
        deletedAt: null,
        fileName: 'fail.pdf',
      },
      {
        id: 'att-ok',
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        status: 'uploaded',
        sizeBytes: 500,
        storageKey: 'key-ok',
        retentionDays: 30,
        expiresAt: new Date('2020-01-01'),
        deletedAt: null,
        fileName: 'ok.pdf',
      },
    ];

    mockRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(expired),
    });

    // First save fails, second succeeds
    mockRepo.save
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValue(expired[1]);

    const result = await service.purgeExpired();
    // First item failed, second succeeded
    expect(result.purged).toBe(1);
  });

  it('respects the limit parameter', async () => {
    mockRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    });

    await service.purgeExpired(10);

    const qb = mockRepo.createQueryBuilder();
    expect(qb.limit).toHaveBeenCalledWith(10);
  });
});
