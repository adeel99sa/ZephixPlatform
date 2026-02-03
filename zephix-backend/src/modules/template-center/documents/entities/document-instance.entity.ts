import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { DocTemplate } from './doc-template.entity';
import { DocumentVersion } from './document-version.entity';

@Entity('document_instances')
@Index(['projectId', 'status'])
@Index(['projectId', 'docKey'])
export class DocumentInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'uuid', name: 'doc_template_id', nullable: true })
  docTemplateId: string | null;

  @Column({ type: 'text', name: 'doc_key' })
  docKey: string;

  @Column({ type: 'text', name: 'name' })
  name: string;

  @Column({ type: 'text', name: 'content_type' })
  contentType: string;

  @Column({ type: 'text', name: 'status' })
  status: string; // not_started, draft, in_review, approved, completed, superseded

  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId: string;

  @Column({ type: 'uuid', array: true, name: 'reviewer_ids', default: [] })
  reviewerIds: string[];

  @Column({ type: 'text', name: 'phase_key', nullable: true })
  phaseKey: string | null;

  @Column({ type: 'date', name: 'due_date', nullable: true })
  dueDate: Date | null;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'uuid', name: 'completed_by', nullable: true })
  completedBy: string | null;

  @Column({ type: 'int', name: 'current_version', default: 1 })
  currentVersion: number;

  @Column({ type: 'boolean', name: 'is_required', default: false })
  isRequired: boolean;

  @Column({ type: 'text', name: 'blocks_gate_key', nullable: true })
  blocksGateKey: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => DocTemplate, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'doc_template_id' })
  docTemplate?: DocTemplate | null;

  @OneToMany(() => DocumentVersion, (v) => v.documentInstance)
  versions?: DocumentVersion[];
}
