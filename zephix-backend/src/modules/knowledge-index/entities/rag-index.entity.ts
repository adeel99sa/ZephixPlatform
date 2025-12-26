import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';
import { Workspace } from '../../../modules/workspaces/entities/workspace.entity';
import { Project } from '../../../modules/projects/entities/project.entity';

/**
 * Phase 8: RAG Index Entity
 * Stores embeddings and text for knowledge retrieval
 * Note: If using pgvector, change embedding type to vector(1536)
 */
@Entity('rag_index')
@Index(['organizationId'])
@Index(['documentType'])
@Index(['documentId'])
@Index(['projectId'])
export class RagIndex {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb' })
  embedding: number[]; // Array of numbers representing embedding vector

  @Column({ type: 'varchar', length: 50, name: 'document_type' })
  documentType:
    | 'task'
    | 'risk'
    | 'comment'
    | 'meeting_note'
    | 'status_report'
    | 'decision_log'
    | 'objective'
    | 'change'
    | 'approval';

  @Column({ type: 'uuid', name: 'document_id' })
  documentId: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'uuid', name: 'workspace_id', nullable: true })
  workspaceId?: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'workspace_id' })
  workspace?: Workspace;

  @Column({ type: 'uuid', name: 'project_id', nullable: true })
  projectId?: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
