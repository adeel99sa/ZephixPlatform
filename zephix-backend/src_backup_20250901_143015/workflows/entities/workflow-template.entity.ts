import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { Organization } from '../modules/organizations/entities/organization.entity';
import { User } from '../../modules/users/entities/user.entity';
import { WorkflowStage } from './workflow-stage.entity';
import { WorkflowVersion } from './workflow-version.entity';

export enum WorkflowType {
  WATERFALL = 'waterfall',
  AGILE = 'agile',
  HYBRID = 'hybrid',
  CUSTOM = 'custom',
}

export enum WorkflowStatus {
  ACTIVE = 'active',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
  DEPRECATED = 'deprecated',
}

@Entity('workflow_templates')
@Index('IDX_WORKFLOW_TEMPLATE_ORG', ['organizationId'])
@Index('IDX_WORKFLOW_TEMPLATE_TYPE', ['type'])
@Index('IDX_WORKFLOW_TEMPLATE_STATUS', ['status'])
@Index('IDX_WORKFLOW_TEMPLATE_CREATED_BY', ['createdBy'])
export class WorkflowTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @Column('uuid')
  createdBy: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: WorkflowType,
    default: WorkflowType.CUSTOM,
  })
  type: WorkflowType;

  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.DRAFT,
  })
  status: WorkflowStatus;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  // Relations
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @OneToMany(() => WorkflowStage, (stage) => stage.workflowTemplate, {
    cascade: true,
    eager: true,
  })
  stages: WorkflowStage[];

  @OneToMany(() => WorkflowVersion, (version) => version.workflowTemplate, {
    cascade: true,
  })
  versions: WorkflowVersion[];

  // Helper methods
  isActive(): boolean {
    return this.status === WorkflowStatus.ACTIVE;
  }

  canBeModified(): boolean {
    return this.status === WorkflowStatus.DRAFT;
  }

  incrementUsage(): void {
    this.usageCount++;
    this.lastUsedAt = new Date();
  }

  clone(): Partial<WorkflowTemplate> {
    const {
      id,
      createdAt,
      updatedAt,
      deletedAt,
      usageCount,
      lastUsedAt,
      ...clone
    } = this;
    return {
      ...clone,
      name: `${clone.name} (Copy)`,
      isDefault: false,
      status: WorkflowStatus.DRAFT,
      version: 1,
    };
  }
}
