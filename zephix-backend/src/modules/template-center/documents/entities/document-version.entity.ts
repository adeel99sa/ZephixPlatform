import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DocumentInstance } from './document-instance.entity';

@Entity('document_versions')
@Index(['documentInstanceId', 'versionNumber'], { unique: true })
export class DocumentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'document_instance_id' })
  documentInstanceId: string;

  @Column({ type: 'int', name: 'version_number' })
  versionNumber: number;

  @Column({ type: 'jsonb', name: 'content', nullable: true })
  content: Record<string, any> | null;

  @Column({ type: 'text', name: 'file_storage_key', nullable: true })
  fileStorageKey: string | null;

  @Column({ type: 'text', name: 'file_hash', nullable: true })
  fileHash: string | null;

  @Column({ type: 'text', name: 'external_url', nullable: true })
  externalUrl: string | null;

  @Column({ type: 'jsonb', name: 'form_data', nullable: true })
  formData: Record<string, any> | null;

  @Column({ type: 'text', name: 'change_summary', nullable: true })
  changeSummary: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => DocumentInstance, (d) => d.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_instance_id' })
  documentInstance?: DocumentInstance;
}
