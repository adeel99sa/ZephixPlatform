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
import { Project } from '../../projects/entities/project.entity';
import { Template } from '../../templates/entities/template.entity';
import { ProjectStatus } from '../../work-management/entities/project-status.entity';
import { User } from '../../users/entities/user.entity';
import { ProjectArtifactItem } from './project-artifact-item.entity';

export type ProjectArtifactType =
  | 'risk_register'
  | 'raid_log'
  | 'lessons_learned'
  | 'status_report'
  | 'decision_log'
  | 'stakeholder_register'
  | 'backlog'
  | 'sprint_ceremonies'
  | 'user_story'
  | 'brd'
  | 'custom';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'enum' | 'person' | 'rating' | 'currency';
  required: boolean;
  enumValues?: string[];
  defaultValue?: unknown;
  displayOrder?: number;
}

@Entity('project_artifacts')
@Index('idx_project_artifacts_project_id', ['projectId'], { where: '"deleted_at" IS NULL' })
@Index('idx_project_artifacts_org_project', ['organizationId', 'projectId'])
@Index('idx_project_artifacts_workspace_id', ['workspaceId'], { where: '"deleted_at" IS NULL' })
@Index('idx_project_artifacts_type', ['type'], { where: '"deleted_at" IS NULL' })
export class ProjectArtifact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'varchar', length: 50 })
  type: ProjectArtifactType;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon?: string | null;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ type: 'uuid', name: 'template_id', nullable: true })
  templateId?: string | null;

  /**
   * Reserved for future status-group integration. Currently NULL for all rows;
   * see Sprint 5.1 N1 resolution and project_statuses (per-project, not global).
   */
  @Column({ type: 'uuid', name: 'status_group_id', nullable: true })
  statusGroupId?: string | null;

  @Column({ type: 'jsonb', name: 'custom_field_definitions', default: () => "'[]'::jsonb" })
  customFieldDefinitions: CustomFieldDefinition[];

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  // ── Relations ──────────────────────────────────────────────────────
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @ManyToOne(() => Template, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'template_id' })
  template?: Template | null;

  @ManyToOne(() => ProjectStatus, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'status_group_id' })
  statusGroup?: ProjectStatus | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator?: User;

  @OneToMany(() => ProjectArtifactItem, (item) => item.artifact)
  items?: ProjectArtifactItem[];
}
