import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export type AttachmentParentType = 'work_task' | 'work_risk' | 'doc' | 'comment';
export type AttachmentStatus = 'pending' | 'uploaded' | 'deleted';

@Entity('attachments')
@Index('IDX_attachments_org_ws_parent', ['organizationId', 'workspaceId', 'parentType', 'parentId'])
@Index('IDX_attachments_org_ws_uploaded', ['organizationId', 'workspaceId', 'uploadedAt'])
@Index('IDX_attachments_org_ws_expires', ['organizationId', 'workspaceId', 'expiresAt'])
@Index('IDX_attachments_org_ws_status_uploaded', ['organizationId', 'workspaceId', 'status', 'uploadedAt'])
@Unique('UQ_attachments_storage_key', ['storageKey'])
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'uploader_user_id' })
  uploaderUserId: string;

  @Column({ type: 'varchar', length: 30, name: 'parent_type' })
  parentType: AttachmentParentType;

  @Column({ type: 'uuid', name: 'parent_id' })
  parentId: string;

  @Column({ type: 'varchar', length: 500, name: 'file_name' })
  fileName: string;

  @Column({ type: 'varchar', length: 255, name: 'mime_type', default: 'application/octet-stream' })
  mimeType: string;

  @Column({ type: 'bigint', name: 'size_bytes', default: 0 })
  sizeBytes: number;

  @Column({ type: 'varchar', length: 20, name: 'storage_provider', default: 's3' })
  storageProvider: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  bucket: string;

  @Column({ type: 'varchar', length: 1024, name: 'storage_key' })
  storageKey: string;

  @Column({ type: 'varchar', length: 64, name: 'checksum_sha256', nullable: true })
  checksumSha256: string | null;

  @Column({ type: 'timestamptz', name: 'uploaded_at', nullable: true })
  uploadedAt: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: AttachmentStatus;

  @Column({ type: 'int', name: 'retention_days', nullable: true })
  retentionDays: number | null;

  @Column({ type: 'timestamptz', name: 'expires_at', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'timestamptz', name: 'last_downloaded_at', nullable: true })
  lastDownloadedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
