import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  GoneException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment, AttachmentParentType } from '../entities/attachment.entity';
import { WorkspaceStorageUsage } from '../../billing/entities/workspace-storage-usage.entity';
import { StorageService } from '../storage/storage.service';
import { AttachmentAccessService } from './attachment-access.service';
import { EntitlementService } from '../../billing/entitlements/entitlement.service';
import { STORAGE_WARNING_THRESHOLD } from '../../billing/entitlements/entitlement.registry';
import { toAttachmentDto, AttachmentResponseDto } from '../dto/attachment.dto';
import { AuditService } from '../../audit/services/audit.service';
import { AuditEntityType, AuditAction, AuditSource } from '../../audit/audit.constants';
import { randomUUID } from 'crypto';

/** Blocked executable extensions — security policy */
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.ps1', '.sh', '.vbs', '.js',
]);

/** Max file name length after sanitization */
const MAX_FILENAME_LENGTH = 255;

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);
  private readonly maxBytes: number;

  constructor(
    @InjectRepository(Attachment)
    private readonly repo: Repository<Attachment>,
    @InjectRepository(WorkspaceStorageUsage)
    private readonly storageUsageRepo: Repository<WorkspaceStorageUsage>,
    private readonly storageService: StorageService,
    private readonly accessService: AttachmentAccessService,
    private readonly configService: ConfigService,
    private readonly entitlementService: EntitlementService,
    private readonly auditService: AuditService,
  ) {
    this.maxBytes = parseInt(
      this.configService.get<string>('ATTACHMENTS_MAX_BYTES') || '52428800',
      10,
    );
  }

  // ── Presign ──────────────────────────────────────────────────────────

  async createPresign(
    auth: { userId: string; organizationId: string; platformRole: string },
    workspaceId: string,
    dto: {
      parentType: AttachmentParentType;
      parentId: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    },
  ): Promise<{ attachment: AttachmentResponseDto; presignedPutUrl: string; headers?: Record<string, string> }> {
    // Enforce write access
    await this.accessService.assertCanWriteParent(auth, workspaceId, dto.parentType, dto.parentId);

    // Validate size
    if (dto.sizeBytes > this.maxBytes) {
      throw new BadRequestException(
        `File size ${dto.sizeBytes} exceeds maximum ${this.maxBytes} bytes (50 MB)`,
      );
    }
    if (dto.sizeBytes <= 0) {
      throw new BadRequestException('File size must be greater than 0');
    }

    // Phase 3C: Check org-wide storage quota against used_bytes + reserved_bytes + new_size
    const orgTotalBytes = await this.getOrgEffectiveUsage(auth.organizationId);
    const maxStorageBytes = await this.entitlementService.getLimit(auth.organizationId, 'max_storage_bytes');
    if (maxStorageBytes !== null && (orgTotalBytes + dto.sizeBytes) > maxStorageBytes) {
      throw new ForbiddenException({
        code: 'STORAGE_LIMIT_EXCEEDED',
        message: `Storage quota exceeded. Effective usage: ${orgTotalBytes}, limit: ${maxStorageBytes}, requested: ${dto.sizeBytes}`,
        usedBytes: orgTotalBytes,
        limitBytes: maxStorageBytes,
      });
    }

    // Validate filename — block executables, sanitize path traversal
    const safeName = this.sanitizeFileName(dto.fileName);
    const ext = safeName.includes('.') ? '.' + safeName.split('.').pop()!.toLowerCase() : '';
    if (BLOCKED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(`File extension "${ext}" is not allowed`);
    }

    // Generate server-side storage key — never from client input
    const fileUuid = randomUUID();
    const storageKey = [
      auth.organizationId,
      workspaceId,
      dto.parentType,
      dto.parentId,
      `${fileUuid}-${safeName}`,
    ].join('/');

    const bucket = this.storageService.getBucket();

    // Phase 3C: Atomically reserve bytes before creating the attachment
    await this.reserveBytes(auth.organizationId, workspaceId, dto.sizeBytes);

    // Create pending record
    const attachment = this.repo.create({
      organizationId: auth.organizationId,
      workspaceId,
      uploaderUserId: auth.userId,
      parentType: dto.parentType,
      parentId: dto.parentId,
      fileName: safeName,
      mimeType: dto.mimeType || 'application/octet-stream',
      sizeBytes: dto.sizeBytes,
      storageProvider: 's3',
      bucket,
      storageKey,
      status: 'pending',
    });
    const saved = await this.repo.save(attachment);

    // Generate presigned PUT URL
    const presignedPutUrl = await this.storageService.getPresignedPutUrl(
      storageKey,
      dto.mimeType,
      dto.sizeBytes,
    );

    this.logger.log({
      context: 'ATTACHMENT_PRESIGN',
      attachmentId: saved.id,
      parentType: dto.parentType,
      parentId: dto.parentId,
      sizeBytes: dto.sizeBytes,
    });

    // Phase 3B: Audit presign_create
    await this.auditService.record({
      organizationId: auth.organizationId,
      workspaceId,
      actorUserId: auth.userId,
      actorPlatformRole: auth.platformRole,
      entityType: AuditEntityType.ATTACHMENT,
      entityId: saved.id,
      action: AuditAction.PRESIGN_CREATE,
      metadata: {
        parentType: dto.parentType,
        parentId: dto.parentId,
        fileName: safeName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        source: AuditSource.ATTACHMENTS,
      },
    });

    // Phase 3C: Return storage warning header if approaching quota
    const headers: Record<string, string> = {};
    if (maxStorageBytes !== null) {
      const afterUsage = orgTotalBytes + dto.sizeBytes;
      if (afterUsage / maxStorageBytes >= STORAGE_WARNING_THRESHOLD) {
        headers['X-Zephix-Storage-Warning'] = 'Approaching quota';
      }
    }

    return {
      attachment: toAttachmentDto(saved),
      presignedPutUrl,
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
    };
  }

  // ── Complete Upload ──────────────────────────────────────────────────

  async completeUpload(
    auth: { userId: string; organizationId: string; platformRole: string },
    workspaceId: string,
    attachmentId: string,
    checksumSha256?: string,
  ): Promise<AttachmentResponseDto> {
    const attachment = await this.findOneOrFail(attachmentId, auth.organizationId, workspaceId);

    // Verify write access on parent
    await this.accessService.assertCanWriteParent(
      auth,
      workspaceId,
      attachment.parentType,
      attachment.parentId,
    );

    if (attachment.status !== 'pending') {
      throw new BadRequestException('Attachment is not in pending state');
    }

    attachment.status = 'uploaded';
    attachment.uploadedAt = new Date();
    if (checksumSha256) {
      attachment.checksumSha256 = checksumSha256;
    }

    // Phase 3C: Set retention policy from org plan
    const retentionDays = await this.entitlementService.getLimit(
      auth.organizationId,
      'attachment_retention_days',
    );
    if (retentionDays !== null && typeof retentionDays === 'number') {
      attachment.retentionDays = retentionDays;
      attachment.expiresAt = new Date(
        attachment.uploadedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000,
      );
    } else {
      attachment.retentionDays = null;
      attachment.expiresAt = null;
    }

    const saved = await this.repo.save(attachment);

    // Phase 3C: Move bytes from reserved to used atomically
    await this.moveReservedToUsed(auth.organizationId, workspaceId, saved.sizeBytes);

    this.logger.log({ context: 'ATTACHMENT_UPLOADED', attachmentId: saved.id });

    // Phase 3B: Audit upload_complete
    await this.auditService.record({
      organizationId: auth.organizationId,
      workspaceId,
      actorUserId: auth.userId,
      actorPlatformRole: auth.platformRole,
      entityType: AuditEntityType.ATTACHMENT,
      entityId: saved.id,
      action: AuditAction.UPLOAD_COMPLETE,
      metadata: {
        parentType: saved.parentType,
        parentId: saved.parentId,
        fileName: saved.fileName,
        sizeBytes: saved.sizeBytes,
        retentionDays: saved.retentionDays,
        expiresAt: saved.expiresAt?.toISOString() ?? null,
        source: AuditSource.ATTACHMENTS,
      },
    });

    return toAttachmentDto(saved);
  }

  // ── List ─────────────────────────────────────────────────────────────

  async listForParent(
    auth: { userId: string; organizationId: string; platformRole: string },
    workspaceId: string,
    parentType: AttachmentParentType,
    parentId: string,
  ): Promise<AttachmentResponseDto[]> {
    await this.accessService.assertCanReadParent(auth, workspaceId, parentType, parentId);

    const attachments = await this.repo.find({
      where: {
        organizationId: auth.organizationId,
        workspaceId,
        parentType,
        parentId,
        status: 'uploaded',
        deletedAt: null as any,
      },
      order: { uploadedAt: 'DESC' },
    });

    return attachments.map(toAttachmentDto);
  }

  // ── Download ─────────────────────────────────────────────────────────

  async getDownloadUrl(
    auth: { userId: string; organizationId: string; platformRole: string },
    workspaceId: string,
    attachmentId: string,
  ): Promise<{ downloadUrl: string; attachment: AttachmentResponseDto }> {
    const attachment = await this.repo.findOne({
      where: { id: attachmentId, organizationId: auth.organizationId, workspaceId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    // Phase 3C: Block download for non-uploaded statuses
    if (attachment.status === 'pending') {
      throw new NotFoundException('Attachment upload not yet completed');
    }
    if (attachment.status === 'deleted' || attachment.deletedAt) {
      throw new NotFoundException('Attachment has been deleted');
    }

    // Phase 3C: Block download for expired attachments
    if (attachment.expiresAt && new Date() > attachment.expiresAt) {
      throw new GoneException({
        code: 'ATTACHMENT_EXPIRED',
        message: 'Attachment has expired per retention policy',
        expiresAt: attachment.expiresAt.toISOString(),
      });
    }

    await this.accessService.assertCanReadParent(
      auth,
      workspaceId,
      attachment.parentType,
      attachment.parentId,
    );

    const downloadUrl = await this.storageService.getPresignedGetUrl(
      attachment.storageKey,
      attachment.fileName,
    );

    // Phase 3C: Update last_downloaded_at best effort
    try {
      await this.repo.update(
        { id: attachment.id },
        { lastDownloadedAt: new Date() },
      );
    } catch (err) {
      this.logger.warn({
        context: 'DOWNLOAD_TIMESTAMP_UPDATE_FAILED',
        attachmentId: attachment.id,
        error: (err as Error).message,
      });
    }

    // Phase 3C: Audit download_link
    await this.auditService.record({
      organizationId: auth.organizationId,
      workspaceId,
      actorUserId: auth.userId,
      actorPlatformRole: auth.platformRole,
      entityType: AuditEntityType.ATTACHMENT,
      entityId: attachment.id,
      action: AuditAction.DOWNLOAD_LINK,
      metadata: {
        attachmentId: attachment.id,
        parentType: attachment.parentType,
        parentId: attachment.parentId,
        source: AuditSource.ATTACHMENTS,
      },
    });

    return { downloadUrl, attachment: toAttachmentDto(attachment) };
  }

  // ── Delete ───────────────────────────────────────────────────────────

  async deleteAttachment(
    auth: { userId: string; organizationId: string; platformRole: string },
    workspaceId: string,
    attachmentId: string,
  ): Promise<void> {
    const attachment = await this.findOneOrFail(attachmentId, auth.organizationId, workspaceId);

    await this.accessService.assertCanWriteParent(
      auth,
      workspaceId,
      attachment.parentType,
      attachment.parentId,
    );

    const previousStatus = attachment.status;

    // Soft delete
    attachment.status = 'deleted';
    attachment.deletedAt = new Date();
    await this.repo.save(attachment);

    // Phase 3C: Decrement correct bucket based on previous status
    if (previousStatus === 'uploaded') {
      await this.decrementUsedBytes(auth.organizationId, workspaceId, attachment.sizeBytes);
    } else if (previousStatus === 'pending') {
      await this.releaseReservedBytes(auth.organizationId, workspaceId, attachment.sizeBytes);
    }

    // Best-effort storage cleanup
    try {
      await this.storageService.deleteObject(attachment.storageKey);
    } catch (err) {
      this.logger.warn({
        context: 'STORAGE_DELETE_FAILED',
        attachmentId: attachment.id,
        error: (err as Error).message,
      });
    }

    this.logger.log({ context: 'ATTACHMENT_DELETED', attachmentId: attachment.id });

    // Phase 3B: Audit delete
    const isOwner = attachment.uploaderUserId === auth.userId;
    await this.auditService.record({
      organizationId: auth.organizationId,
      workspaceId,
      actorUserId: auth.userId,
      actorPlatformRole: auth.platformRole,
      entityType: AuditEntityType.ATTACHMENT,
      entityId: attachment.id,
      action: AuditAction.DELETE,
      metadata: {
        parentType: attachment.parentType,
        parentId: attachment.parentId,
        fileName: attachment.fileName,
        sizeBytes: attachment.sizeBytes,
        previousStatus,
        deletedByOwner: isOwner,
        source: AuditSource.ATTACHMENTS,
      },
    });
  }

  // ── Retention Override (Phase 3C) ───────────────────────────────────

  async updateRetention(
    auth: { userId: string; organizationId: string; platformRole: string },
    workspaceId: string,
    attachmentId: string,
    retentionDays: number | null,
  ): Promise<AttachmentResponseDto> {
    const attachment = await this.findOneOrFail(attachmentId, auth.organizationId, workspaceId);

    if (attachment.status !== 'uploaded') {
      throw new BadRequestException('Retention can only be set on uploaded attachments');
    }

    const oldRetentionDays = attachment.retentionDays;

    if (retentionDays !== null) {
      if (retentionDays < 1 || retentionDays > 3650) {
        throw new BadRequestException('retentionDays must be between 1 and 3650');
      }
      attachment.retentionDays = retentionDays;
      attachment.expiresAt = attachment.uploadedAt
        ? new Date(attachment.uploadedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000)
        : null;
    } else {
      attachment.retentionDays = null;
      attachment.expiresAt = null;
    }

    const saved = await this.repo.save(attachment);

    // Audit the retention override
    await this.auditService.record({
      organizationId: auth.organizationId,
      workspaceId,
      actorUserId: auth.userId,
      actorPlatformRole: auth.platformRole,
      entityType: AuditEntityType.ATTACHMENT,
      entityId: attachment.id,
      action: AuditAction.UPDATE,
      metadata: {
        oldRetentionDays,
        newRetentionDays: retentionDays,
        expiresAt: saved.expiresAt?.toISOString() ?? null,
        source: AuditSource.ATTACHMENTS,
      },
    });

    return toAttachmentDto(saved);
  }

  // ── Retention Cleanup (Phase 3C) ───────────────────────────────────

  /**
   * Purge expired attachments. Called by retention job or admin endpoint.
   * Returns count of purged attachments.
   */
  async purgeExpired(limit = 500): Promise<{ purged: number }> {
    const now = new Date();
    const expired = await this.repo
      .createQueryBuilder('a')
      .where('a.status = :status', { status: 'uploaded' })
      .andWhere('a.expires_at IS NOT NULL')
      .andWhere('a.expires_at < :now', { now })
      .andWhere('a.deleted_at IS NULL')
      .orderBy('a.expires_at', 'ASC')
      .limit(limit)
      .getMany();

    let purged = 0;
    for (const att of expired) {
      try {
        att.status = 'deleted';
        att.deletedAt = now;
        await this.repo.save(att);

        await this.decrementUsedBytes(att.organizationId, att.workspaceId, att.sizeBytes);

        // Best-effort storage delete
        try {
          await this.storageService.deleteObject(att.storageKey);
        } catch (err) {
          this.logger.warn({
            context: 'RETENTION_STORAGE_DELETE_FAILED',
            attachmentId: att.id,
            error: (err as Error).message,
          });
        }

        // Audit with system actor
        await this.auditService.record({
          organizationId: att.organizationId,
          workspaceId: att.workspaceId,
          actorUserId: '00000000-0000-0000-0000-000000000000', // system
          actorPlatformRole: 'ADMIN',
          entityType: AuditEntityType.ATTACHMENT,
          entityId: att.id,
          action: AuditAction.DELETE,
          metadata: {
            source: 'retention_job',
            retentionDays: att.retentionDays,
            expiredAt: att.expiresAt?.toISOString(),
            fileName: att.fileName,
            sizeBytes: att.sizeBytes,
          },
        });

        purged++;
      } catch (err) {
        this.logger.error({
          context: 'RETENTION_PURGE_ITEM_FAILED',
          attachmentId: att.id,
          error: (err as Error).message,
        });
      }
    }

    if (purged > 0) {
      this.logger.log({ context: 'RETENTION_PURGE_COMPLETE', purged, total: expired.length });
    }

    return { purged };
  }

  // ── Storage Tracking (Phase 3C: reserved + used) ────────────────────

  /**
   * Get total effective storage (used + reserved) across all workspaces in org.
   * This is the number checked against quota.
   */
  async getOrgEffectiveUsage(organizationId: string): Promise<number> {
    const result = await this.storageUsageRepo.query(
      `SELECT COALESCE(SUM(used_bytes + reserved_bytes), 0) AS total
       FROM workspace_storage_usage
       WHERE organization_id = $1`,
      [organizationId],
    );
    return parseInt(result?.[0]?.total ?? '0', 10);
  }

  /** Get total used_bytes only (for reporting) */
  async getOrgStorageUsed(organizationId: string): Promise<number> {
    const result = await this.storageUsageRepo.query(
      `SELECT COALESCE(SUM(used_bytes), 0) AS total
       FROM workspace_storage_usage
       WHERE organization_id = $1`,
      [organizationId],
    );
    return parseInt(result?.[0]?.total ?? '0', 10);
  }

  /** Get storage usage for a specific workspace */
  async getWorkspaceStorageUsed(organizationId: string, workspaceId: string): Promise<number> {
    const usage = await this.storageUsageRepo.findOne({
      where: { organizationId, workspaceId },
    });
    return Number(usage?.usedBytes ?? 0);
  }

  /** Get reserved bytes for a specific workspace */
  async getWorkspaceReservedBytes(organizationId: string, workspaceId: string): Promise<number> {
    const usage = await this.storageUsageRepo.findOne({
      where: { organizationId, workspaceId },
    });
    return Number(usage?.reservedBytes ?? 0);
  }

  /**
   * Phase 3C: Atomically reserve bytes on presign.
   * Uses INSERT ... ON CONFLICT to upsert atomically.
   */
  private async reserveBytes(
    organizationId: string,
    workspaceId: string,
    bytes: number,
  ): Promise<void> {
    const safeBytes = Math.max(0, bytes);
    try {
      await this.storageUsageRepo.query(
        `INSERT INTO workspace_storage_usage (organization_id, workspace_id, used_bytes, reserved_bytes)
         VALUES ($1, $2, 0, $3)
         ON CONFLICT (organization_id, workspace_id)
         DO UPDATE SET reserved_bytes = workspace_storage_usage.reserved_bytes + $3,
                       updated_at = now()`,
        [organizationId, workspaceId, safeBytes],
      );
    } catch (err) {
      this.logger.warn({
        context: 'STORAGE_RESERVE_FAILED',
        organizationId,
        workspaceId,
        bytes,
        error: (err as Error).message,
      });
    }
  }

  /**
   * Phase 3C: Move bytes from reserved to used on completeUpload.
   * Single atomic query. Uses GREATEST(0, ...) to prevent reserved going negative.
   */
  private async moveReservedToUsed(
    organizationId: string,
    workspaceId: string,
    bytes: number,
  ): Promise<void> {
    const safeBytes = Math.max(0, bytes);
    try {
      const result = await this.storageUsageRepo.query(
        `UPDATE workspace_storage_usage
         SET reserved_bytes = GREATEST(0, reserved_bytes - $3),
             used_bytes = used_bytes + $3,
             updated_at = now()
         WHERE organization_id = $1 AND workspace_id = $2`,
        [organizationId, workspaceId, safeBytes],
      );
      // Check if reserved went to unexpected state
      if (result?.[1] === 0) {
        this.logger.warn({
          context: 'STORAGE_MOVE_NO_ROW',
          organizationId,
          workspaceId,
          bytes,
        });
      }
    } catch (err) {
      this.logger.warn({
        context: 'STORAGE_MOVE_FAILED',
        organizationId,
        workspaceId,
        bytes,
        error: (err as Error).message,
      });
    }
  }

  /**
   * Phase 3C: Release reserved bytes when a pending attachment is deleted.
   * Uses GREATEST(0, ...) to prevent negatives.
   */
  private async releaseReservedBytes(
    organizationId: string,
    workspaceId: string,
    bytes: number,
  ): Promise<void> {
    const safeBytes = Math.max(0, bytes);
    try {
      await this.storageUsageRepo.query(
        `UPDATE workspace_storage_usage
         SET reserved_bytes = GREATEST(0, reserved_bytes - $3),
             updated_at = now()
         WHERE organization_id = $1 AND workspace_id = $2`,
        [organizationId, workspaceId, safeBytes],
      );
    } catch (err) {
      this.logger.warn({
        context: 'STORAGE_RELEASE_RESERVED_FAILED',
        organizationId,
        workspaceId,
        bytes,
        error: (err as Error).message,
      });
    }
  }

  /**
   * Phase 3C: Decrement used_bytes when an uploaded attachment is deleted.
   * Uses GREATEST(0, ...) to prevent negatives.
   */
  private async decrementUsedBytes(
    organizationId: string,
    workspaceId: string,
    bytes: number,
  ): Promise<void> {
    const safeBytes = Math.max(0, bytes);
    try {
      await this.storageUsageRepo.query(
        `UPDATE workspace_storage_usage
         SET used_bytes = GREATEST(0, used_bytes - $3),
             updated_at = now()
         WHERE organization_id = $1 AND workspace_id = $2`,
        [organizationId, workspaceId, safeBytes],
      );
    } catch (err) {
      this.logger.warn({
        context: 'STORAGE_DECREMENT_FAILED',
        organizationId,
        workspaceId,
        bytes,
        error: (err as Error).message,
      });
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private async findOneOrFail(
    id: string,
    organizationId: string,
    workspaceId: string,
  ): Promise<Attachment> {
    const attachment = await this.repo.findOne({
      where: { id, organizationId, workspaceId, deletedAt: null as any },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    return attachment;
  }

  /**
   * Sanitize file name:
   * - Strip path components (no traversal)
   * - Replace unsafe characters
   * - Truncate to MAX_FILENAME_LENGTH
   */
  private sanitizeFileName(raw: string): string {
    // Strip path separators
    let name = raw.replace(/[/\\]/g, '_');
    // Remove null bytes
    name = name.replace(/\0/g, '');
    // Remove directory traversal sequences
    name = name.replace(/\.{2,}/g, '_');
    // Collapse whitespace
    name = name.replace(/\s+/g, '_');
    // Truncate
    if (name.length > MAX_FILENAME_LENGTH) {
      const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
      name = name.slice(0, MAX_FILENAME_LENGTH - ext.length) + ext;
    }
    return name || 'unnamed';
  }
}
