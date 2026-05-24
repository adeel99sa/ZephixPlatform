import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ProjectArtifact } from './project-artifact.entity';
import { ProjectStatus } from '../../work-management/entities/project-status.entity';
import { User } from '../../users/entities/user.entity';

export type ArtifactItemPriority = 'urgent' | 'high' | 'normal' | 'low';

@Entity('project_artifact_items')
@Index('idx_artifact_items_artifact_id', ['artifactId'], { where: '"deleted_at" IS NULL' })
@Index('idx_artifact_items_org_artifact', ['organizationId', 'artifactId'])
@Index('idx_artifact_items_workspace_id', ['workspaceId'], { where: '"deleted_at" IS NULL' })
@Index('idx_artifact_items_assignee', ['assigneeId'], { where: '"assignee_id" IS NOT NULL' })
@Index('idx_artifact_items_status', ['statusId'], { where: '"status_id" IS NOT NULL' })
@Index('idx_artifact_items_parent', ['parentItemId'], { where: '"parent_item_id" IS NOT NULL' })
export class ProjectArtifactItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'artifact_id' })
  artifactId: string;

  @Column({ type: 'varchar', length: 500 })
  name: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  content: Record<string, unknown>;

  @Column({ type: 'uuid', name: 'status_id', nullable: true })
  statusId?: string | null;

  @Column({ type: 'uuid', name: 'assignee_id', nullable: true })
  assigneeId?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  priority?: ArtifactItemPriority | null;

  @Column({ type: 'timestamptz', name: 'due_date', nullable: true })
  dueDate?: Date | null;

  @Column({ type: 'jsonb', name: 'custom_field_values', default: () => "'{}'::jsonb" })
  customFieldValues: Record<string, unknown>;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ type: 'uuid', name: 'parent_item_id', nullable: true })
  parentItemId?: string | null;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  // ── Relations ──────────────────────────────────────────────────────
  @ManyToOne(() => ProjectArtifact, (artifact) => artifact.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'artifact_id' })
  artifact?: ProjectArtifact;

  @ManyToOne(() => ProjectStatus, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'status_id' })
  status?: ProjectStatus | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignee_id' })
  assignee?: User | null;

  @ManyToOne(() => ProjectArtifactItem, (item) => item.children, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_item_id' })
  parentItem?: ProjectArtifactItem | null;

  @OneToMany(() => ProjectArtifactItem, (item) => item.parentItem)
  children?: ProjectArtifactItem[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator?: User;
}
