/**
 * Phase 3C: Retention Entitlement Integration Tests
 *
 * Covers: entitlement registry retention values per plan,
 * plan-based retention applied during completeUpload,
 * DTO includes retention fields.
 */
import { PLAN_ENTITLEMENTS } from '../../billing/entitlements/entitlement.registry';
import { PlanCode } from '../../billing/entitlements/plan-code.enum';
import { toAttachmentDto } from '../dto/attachment.dto';

describe('Retention Entitlement (Phase 3C)', () => {
  describe('PLAN_ENTITLEMENTS retention values', () => {
    it('FREE plan has 30 days retention', () => {
      expect(PLAN_ENTITLEMENTS[PlanCode.FREE].attachment_retention_days).toBe(30);
    });

    it('TEAM plan has 180 days retention', () => {
      expect(PLAN_ENTITLEMENTS[PlanCode.TEAM].attachment_retention_days).toBe(180);
    });

    it('ENTERPRISE plan has null retention (no expiry)', () => {
      expect(PLAN_ENTITLEMENTS[PlanCode.ENTERPRISE].attachment_retention_days).toBeNull();
    });

    it('CUSTOM plan has null retention (no expiry)', () => {
      expect(PLAN_ENTITLEMENTS[PlanCode.CUSTOM].attachment_retention_days).toBeNull();
    });

    it('all plans define attachment_retention_days', () => {
      for (const plan of Object.values(PlanCode)) {
        expect(PLAN_ENTITLEMENTS[plan]).toHaveProperty('attachment_retention_days');
      }
    });
  });

  describe('Attachment DTO includes retention fields', () => {
    it('toAttachmentDto includes retentionDays', () => {
      const att = {
        id: 'att-1',
        parentType: 'work_task',
        parentId: 'task-1',
        fileName: 'file.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        uploaderUserId: 'u1',
        uploadedAt: new Date('2026-01-01'),
        status: 'uploaded',
        retentionDays: 30,
        expiresAt: new Date('2026-01-31'),
        lastDownloadedAt: new Date('2026-01-15'),
        createdAt: new Date(),
      };

      const dto = toAttachmentDto(att);
      expect(dto.retentionDays).toBe(30);
      expect(dto.expiresAt).toBe('2026-01-31T00:00:00.000Z');
      expect(dto.lastDownloadedAt).toBe('2026-01-15T00:00:00.000Z');
    });

    it('toAttachmentDto handles null retention fields', () => {
      const att = {
        id: 'att-1',
        parentType: 'work_task',
        parentId: 'task-1',
        fileName: 'file.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        uploaderUserId: 'u1',
        uploadedAt: new Date('2026-01-01'),
        status: 'uploaded',
        retentionDays: null,
        expiresAt: null,
        lastDownloadedAt: null,
        createdAt: new Date(),
      };

      const dto = toAttachmentDto(att);
      expect(dto.retentionDays).toBeNull();
      expect(dto.expiresAt).toBeNull();
      expect(dto.lastDownloadedAt).toBeNull();
    });

    it('toAttachmentDto handles undefined retention fields', () => {
      const att = {
        id: 'att-1',
        parentType: 'work_task',
        parentId: 'task-1',
        fileName: 'file.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        uploaderUserId: 'u1',
        uploadedAt: null,
        status: 'pending',
        createdAt: new Date(),
      };

      const dto = toAttachmentDto(att);
      expect(dto.retentionDays).toBeNull();
      expect(dto.expiresAt).toBeNull();
      expect(dto.lastDownloadedAt).toBeNull();
    });
  });
});
