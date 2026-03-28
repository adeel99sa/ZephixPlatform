/**
 * Phase 3B: Attachment audit integration tests.
 * Verifies that createPresign, completeUpload, and deleteAttachment emit audit events.
 */
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AttachmentsService } from '../../attachments/services/attachments.service';
import { Attachment } from '../../attachments/entities/attachment.entity';
import { WorkspaceStorageUsage } from '../../billing/entities/workspace-storage-usage.entity';
import { StorageService } from '../../attachments/storage/storage.service';
import { AttachmentAccessService } from '../../attachments/services/attachment-access.service';
import { EntitlementService } from '../../billing/entitlements/entitlement.service';
import { AuditService } from '../services/audit.service';
import { AuditEntityType, AuditAction } from '../audit.constants';

const AUTH = { userId: 'u-1', organizationId: 'org-1', platformRole: 'ADMIN' };
const WS_ID = 'ws-1';

describe('Attachments Audit Integration', () => {
  let service: AttachmentsService;
  let auditService: { record: jest.Mock };
  let attachmentRepo: any;
  let storageUsageRepo: any;
  let storageService: any;
  let accessService: any;
  let entitlementService: any;

  beforeEach(async () => {
    auditService = { record: jest.fn().mockResolvedValue({ id: 'evt-1' }) };

    attachmentRepo = {
      create: jest.fn().mockImplementation((data: any) => ({
        ...data,
        id: 'att-1',
        status: data.status || 'pending',
      })),
      save: jest.fn().mockImplementation((entity: any) => Promise.resolve({
        ...entity,
        id: entity.id || 'att-1',
        uploaderUserId: entity.uploaderUserId || AUTH.userId,
        createdAt: entity.createdAt || new Date('2026-01-01'),
        uploadedAt: entity.uploadedAt || null,
      })),
      findOne: jest.fn().mockResolvedValue({
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: WS_ID,
        uploaderUserId: AUTH.userId,
        parentType: 'work_task',
        parentId: 'task-1',
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        status: 'pending',
        storageKey: 'org-1/ws-1/work_task/task-1/uuid-test.pdf',
        createdAt: new Date('2026-01-01'),
      }),
    };

    storageUsageRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      }),
      query: jest.fn().mockResolvedValue(undefined),
    };

    storageService = {
      getPresignedPutUrl: jest.fn().mockResolvedValue('https://s3.example.com/put'),
      getPresignedGetUrl: jest.fn().mockResolvedValue('https://s3.example.com/get'),
      deleteObject: jest.fn().mockResolvedValue(undefined),
      getBucket: jest.fn().mockReturnValue('test-bucket'),
    };

    accessService = {
      assertCanReadParent: jest.fn().mockResolvedValue(undefined),
      assertCanWriteParent: jest.fn().mockResolvedValue(undefined),
    };

    entitlementService = {
      getLimit: jest.fn().mockResolvedValue(null), // unlimited
    };

    const module = await Test.createTestingModule({
      providers: [
        AttachmentsService,
        { provide: getRepositoryToken(Attachment), useValue: attachmentRepo },
        { provide: getRepositoryToken(WorkspaceStorageUsage), useValue: storageUsageRepo },
        { provide: StorageService, useValue: storageService },
        { provide: AttachmentAccessService, useValue: accessService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('52428800') } },
        { provide: EntitlementService, useValue: entitlementService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get(AttachmentsService);
  });

  describe('createPresign', () => {
    it('emits presign_create audit event', async () => {
      await service.createPresign(AUTH, WS_ID, {
        parentType: 'work_task' as any,
        parentId: 'task-1',
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
      });

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          workspaceId: WS_ID,
          actorUserId: AUTH.userId,
          entityType: AuditEntityType.ATTACHMENT,
          action: AuditAction.PRESIGN_CREATE,
        }),
      );
    });

    it('includes parentType, fileName, sizeBytes in audit metadata', async () => {
      await service.createPresign(AUTH, WS_ID, {
        parentType: 'work_task' as any,
        parentId: 'task-1',
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
      });

      const call = auditService.record.mock.calls[0][0];
      expect(call.metadata.parentType).toBe('work_task');
      expect(call.metadata.parentId).toBe('task-1');
      expect(call.metadata.sizeBytes).toBe(1024);
    });

    it('does not include storageKey in audit metadata', async () => {
      await service.createPresign(AUTH, WS_ID, {
        parentType: 'work_task' as any,
        parentId: 'task-1',
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
      });

      const call = auditService.record.mock.calls[0][0];
      expect(call.metadata.storageKey).toBeUndefined();
    });
  });

  describe('completeUpload', () => {
    it('emits upload_complete audit event', async () => {
      // Set up findOne for pending attachment
      attachmentRepo.findOne.mockResolvedValueOnce({
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: WS_ID,
        uploaderUserId: AUTH.userId,
        parentType: 'work_task',
        parentId: 'task-1',
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        status: 'pending',
        storageKey: 'key-1',
        createdAt: new Date('2026-01-01'),
      });

      await service.completeUpload(AUTH, WS_ID, 'att-1', 'sha256hash');

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: AuditEntityType.ATTACHMENT,
          action: AuditAction.UPLOAD_COMPLETE,
          entityId: 'att-1',
        }),
      );
    });

    it('includes fileName and sizeBytes in upload_complete metadata', async () => {
      attachmentRepo.findOne.mockResolvedValueOnce({
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: WS_ID,
        uploaderUserId: AUTH.userId,
        parentType: 'work_task',
        parentId: 'task-1',
        fileName: 'report.docx',
        mimeType: 'application/vnd.openxmlformats',
        sizeBytes: 5000,
        status: 'pending',
        storageKey: 'key-1',
        createdAt: new Date('2026-01-01'),
      });

      await service.completeUpload(AUTH, WS_ID, 'att-1');

      const call = auditService.record.mock.calls[0][0];
      expect(call.metadata.fileName).toBe('report.docx');
      expect(call.metadata.sizeBytes).toBe(5000);
    });
  });

  describe('deleteAttachment', () => {
    it('emits delete audit event', async () => {
      attachmentRepo.findOne.mockResolvedValueOnce({
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: WS_ID,
        uploaderUserId: AUTH.userId,
        parentType: 'work_task',
        parentId: 'task-1',
        fileName: 'test.pdf',
        sizeBytes: 1024,
        status: 'uploaded',
        storageKey: 'key-1',
        createdAt: new Date('2026-01-01'),
      });

      await service.deleteAttachment(AUTH, WS_ID, 'att-1');

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: AuditEntityType.ATTACHMENT,
          action: AuditAction.DELETE,
        }),
      );
    });

    it('records deletedByOwner in metadata', async () => {
      attachmentRepo.findOne.mockResolvedValueOnce({
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: WS_ID,
        uploaderUserId: AUTH.userId,
        parentType: 'work_task',
        parentId: 'task-1',
        fileName: 'test.pdf',
        sizeBytes: 1024,
        status: 'uploaded',
        storageKey: 'key-1',
        createdAt: new Date('2026-01-01'),
      });

      await service.deleteAttachment(AUTH, WS_ID, 'att-1');

      const call = auditService.record.mock.calls[0][0];
      expect(call.metadata.deletedByOwner).toBe(true);
    });

    it('records deletedByOwner=false when admin deletes another user file', async () => {
      attachmentRepo.findOne.mockResolvedValueOnce({
        id: 'att-1',
        organizationId: 'org-1',
        workspaceId: WS_ID,
        uploaderUserId: 'other-user',
        parentType: 'work_task',
        parentId: 'task-1',
        fileName: 'test.pdf',
        sizeBytes: 1024,
        status: 'uploaded',
        storageKey: 'key-1',
        createdAt: new Date('2026-01-01'),
      });

      await service.deleteAttachment(AUTH, WS_ID, 'att-1');

      const call = auditService.record.mock.calls[0][0];
      expect(call.metadata.deletedByOwner).toBe(false);
    });
  });
});
