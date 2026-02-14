/**
 * Phase 3C: Storage Metering Tests — reserved vs used model
 *
 * Covers: reserveBytes on presign, moveReservedToUsed on complete,
 * release on delete pending, decrement on delete uploaded,
 * concurrency near limit, no negative bytes on repeated delete,
 * quota check includes reserved.
 */
import { AttachmentsService } from '../attachments.service';
import { ForbiddenException } from '@nestjs/common';

describe('Storage Metering (reserved vs used)', () => {
  let service: AttachmentsService;
  let mockStorageUsageRepo: any;
  let mockEntitlementService: any;

  const mockRepo = {
    create: jest.fn((data: any) => ({ id: 'att-1', ...data, createdAt: new Date() })),
    save: jest.fn((entity: any) => Promise.resolve(entity)),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn(),
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
    get: jest.fn().mockReturnValue('52428800'), // 50 MB
  };

  const mockAuditService = {
    record: jest.fn().mockResolvedValue({ id: 'evt-1' }),
  } as any;

  const adminAuth = { userId: 'u1', organizationId: 'org-1', platformRole: 'ADMIN' };
  const wsId = 'ws-1';
  const validDto = {
    parentType: 'work_task' as const,
    parentId: 'task-1',
    fileName: 'report.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockStorageUsageRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      query: jest.fn().mockResolvedValue([{ total: '0' }]),
    };

    mockEntitlementService = {
      getLimit: jest.fn().mockResolvedValue(null), // unlimited by default
      assertWithinLimit: jest.fn().mockResolvedValue(undefined),
    };

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

  describe('createPresign reserves bytes', () => {
    it('calls INSERT ON CONFLICT to reserve bytes', async () => {
      await service.createPresign(adminAuth, wsId, validDto);
      // Should have called query twice: once for getOrgEffectiveUsage, once for reserveBytes
      expect(mockStorageUsageRepo.query).toHaveBeenCalledTimes(2);
      const reserveCall = mockStorageUsageRepo.query.mock.calls[1];
      expect(reserveCall[0]).toContain('reserved_bytes');
      expect(reserveCall[0]).toContain('ON CONFLICT');
      expect(reserveCall[1]).toEqual(['org-1', 'ws-1', 1024]);
    });

    it('checks effective usage (used + reserved) against quota', async () => {
      // Simulate 400 bytes used + 500 reserved = 900 effective
      mockStorageUsageRepo.query.mockResolvedValueOnce([{ total: '900' }]);
      mockEntitlementService.getLimit.mockResolvedValue(1000); // 1000 byte limit

      // 1024 bytes requested → 900 + 1024 > 1000 → should fail
      await expect(
        service.createPresign(adminAuth, wsId, validDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows presign when within quota including reserved', async () => {
      mockStorageUsageRepo.query.mockResolvedValueOnce([{ total: '100' }]);
      mockEntitlementService.getLimit.mockResolvedValue(10000);

      const result = await service.createPresign(adminAuth, wsId, validDto);
      expect(result.presignedPutUrl).toBe('https://s3/put-url');
    });
  });

  describe('completeUpload moves reserved to used', () => {
    it('calls atomic move from reserved to used', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: wsId,
        status: 'pending',
        sizeBytes: 2048,
        parentType: 'work_task',
        parentId: 'task-1',
        createdAt: new Date(),
      });
      mockEntitlementService.getLimit.mockResolvedValue(null); // no retention

      await service.completeUpload(adminAuth, wsId, 'att-1');

      // Find the move call (reserved_bytes - and used_bytes +)
      const moveCalls = mockStorageUsageRepo.query.mock.calls.filter(
        (c: any[]) => c[0].includes('reserved_bytes = GREATEST') && c[0].includes('used_bytes = used_bytes +'),
      );
      expect(moveCalls.length).toBe(1);
      expect(moveCalls[0][1]).toEqual(['org-1', 'ws-1', 2048]);
    });
  });

  describe('delete pending releases reserved', () => {
    it('decrements reserved_bytes for pending attachment', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: wsId,
        status: 'pending',
        sizeBytes: 4096,
        storageKey: 'key-1',
        uploaderUserId: 'u1',
        parentType: 'work_task',
        parentId: 'task-1',
        deletedAt: null,
        createdAt: new Date(),
      });

      await service.deleteAttachment(adminAuth, wsId, 'att-1');

      // Should release reserved, not decrement used
      const releaseCalls = mockStorageUsageRepo.query.mock.calls.filter(
        (c: any[]) => c[0].includes('reserved_bytes = GREATEST') && !c[0].includes('used_bytes = used_bytes +'),
      );
      expect(releaseCalls.length).toBe(1);
      expect(releaseCalls[0][1]).toEqual(['org-1', 'ws-1', 4096]);
    });
  });

  describe('delete uploaded releases used', () => {
    it('decrements used_bytes for uploaded attachment', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'att-2',
        organizationId: 'org-1',
        workspaceId: wsId,
        status: 'uploaded',
        sizeBytes: 8192,
        storageKey: 'key-2',
        uploaderUserId: 'u1',
        parentType: 'work_task',
        parentId: 'task-1',
        deletedAt: null,
        createdAt: new Date(),
      });

      await service.deleteAttachment(adminAuth, wsId, 'att-2');

      // Should decrement used_bytes
      const decrementCalls = mockStorageUsageRepo.query.mock.calls.filter(
        (c: any[]) => c[0].includes('used_bytes = GREATEST(0, used_bytes -'),
      );
      expect(decrementCalls.length).toBe(1);
      expect(decrementCalls[0][1]).toEqual(['org-1', 'ws-1', 8192]);
    });
  });

  describe('concurrency: two presigns near limit', () => {
    it('second presign fails when combined exceeds quota', async () => {
      mockEntitlementService.getLimit.mockResolvedValue(2000);

      // First presign: effective usage = 0, fits
      mockStorageUsageRepo.query.mockResolvedValueOnce([{ total: '0' }]);
      mockStorageUsageRepo.query.mockResolvedValueOnce(undefined); // reserve

      const result1 = await service.createPresign(adminAuth, wsId, {
        ...validDto,
        sizeBytes: 1500,
      });
      expect(result1.presignedPutUrl).toBeTruthy();

      // Second presign: effective usage now reflects 1500 reserved
      mockStorageUsageRepo.query.mockResolvedValueOnce([{ total: '1500' }]);

      await expect(
        service.createPresign(adminAuth, wsId, { ...validDto, sizeBytes: 600 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('no negative bytes on repeated delete', () => {
    it('uses GREATEST(0, ...) to prevent negative used_bytes', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'att-3',
        organizationId: 'org-1',
        workspaceId: wsId,
        status: 'uploaded',
        sizeBytes: 1000,
        storageKey: 'key-3',
        uploaderUserId: 'u1',
        parentType: 'work_task',
        parentId: 'task-1',
        deletedAt: null,
        createdAt: new Date(),
      });

      await service.deleteAttachment(adminAuth, wsId, 'att-3');

      const decrementSql = mockStorageUsageRepo.query.mock.calls.find(
        (c: any[]) => c[0].includes('used_bytes = GREATEST(0, used_bytes -'),
      );
      expect(decrementSql).toBeDefined();
      expect(decrementSql[0]).toContain('GREATEST(0');
    });
  });

  describe('storage warning header', () => {
    it('returns X-Zephix-Storage-Warning when approaching quota', async () => {
      mockStorageUsageRepo.query.mockResolvedValueOnce([{ total: '800' }]);
      mockEntitlementService.getLimit.mockResolvedValue(1000);
      // 800 + 1024 = 1824, but the warning check is (800 + 1024) / 1000 = 1.824 >= 0.8
      // Actually, first check: 800 + 1024 > 1000 → STORAGE_LIMIT_EXCEEDED
      // Let me set it so it fits but is over 80%
      mockStorageUsageRepo.query.mockReset();
      mockStorageUsageRepo.query.mockResolvedValueOnce([{ total: '750' }]);
      mockStorageUsageRepo.query.mockResolvedValue(undefined);
      mockEntitlementService.getLimit.mockResolvedValue(1000);

      const result = await service.createPresign(adminAuth, wsId, {
        ...validDto,
        sizeBytes: 100,
      });
      // (750 + 100) / 1000 = 0.85 >= 0.8
      expect(result.headers).toBeDefined();
      expect(result.headers!['X-Zephix-Storage-Warning']).toBe('Approaching quota');
    });

    it('does not return warning when usage is below threshold', async () => {
      mockStorageUsageRepo.query.mockResolvedValueOnce([{ total: '100' }]);
      mockStorageUsageRepo.query.mockResolvedValue(undefined);
      mockEntitlementService.getLimit.mockResolvedValue(10000);

      const result = await service.createPresign(adminAuth, wsId, {
        ...validDto,
        sizeBytes: 100,
      });
      expect(result.headers).toBeUndefined();
    });
  });

  describe('getOrgEffectiveUsage', () => {
    it('returns sum of used_bytes + reserved_bytes', async () => {
      mockStorageUsageRepo.query.mockResolvedValueOnce([{ total: '5000' }]);
      const result = await service.getOrgEffectiveUsage('org-1');
      expect(result).toBe(5000);
      expect(mockStorageUsageRepo.query.mock.calls[0][0]).toContain('used_bytes + reserved_bytes');
    });
  });

  describe('getWorkspaceReservedBytes', () => {
    it('returns reservedBytes from workspace record', async () => {
      mockStorageUsageRepo.findOne.mockResolvedValue({ reservedBytes: 1234 });
      const result = await service.getWorkspaceReservedBytes('org-1', 'ws-1');
      expect(result).toBe(1234);
    });

    it('returns 0 when no record exists', async () => {
      mockStorageUsageRepo.findOne.mockResolvedValue(null);
      const result = await service.getWorkspaceReservedBytes('org-1', 'ws-1');
      expect(result).toBe(0);
    });
  });
});
