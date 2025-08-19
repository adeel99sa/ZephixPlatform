import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { WorkflowTemplate } from './workflow-template.entity';
import { User } from '../../modules/users/entities/user.entity';

@Entity('workflow_versions')
@Index('IDX_WORKFLOW_VERSION_TEMPLATE', ['workflowTemplateId'])
@Index('IDX_WORKFLOW_VERSION_NUMBER', ['workflowTemplateId', 'versionNumber'])
@Index('IDX_WORKFLOW_VERSION_CREATED_BY', ['createdBy'])
export class WorkflowVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  workflowTemplateId: string;

  @Column('uuid')
  createdBy: string;

  @Column({ type: 'int' })
  versionNumber: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  versionName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  templateData: {
    name: string;
    description: string;
    type: string;
    metadata: Record<string, any>;
    stages: Array<{
      id: string;
      name: string;
      description: string;
      type: string;
      order: number;
      estimatedDuration: number;
      durationUnit: string;
      entryCriteria: Record<string, any>;
      exitCriteria: Record<string, any>;
      deliverables: string[];
      roles: Array<{
        role: string;
        responsibilities: string[];
        required: boolean;
      }>;
      raciMatrix: {
        responsible: string[];
        accountable: string[];
        consulted: string[];
        informed: string[];
      };
      requiresApproval: boolean;
      isMilestone: boolean;
      dependencies: string[];
      metadata: Record<string, any>;
    }>;
    approvals: Array<{
      id: string;
      type: string;
      level: string;
      title: string;
      description: string;
      criteria: Record<string, any>;
      requiredDocuments: string[];
      isRequired: boolean;
      canBeSkipped: boolean;
      escalationRules: {
        autoEscalate: boolean;
        escalationDelay: number;
        escalationLevel: string;
        escalationRecipients: string[];
      };
    }>;
  };

  @Column({ type: 'jsonb', default: {} })
  changeLog: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    changeType: 'added' | 'modified' | 'removed';
    timestamp: Date;
    userId: string;
  }>;

  @Column({ type: 'boolean', default: false })
  isPublished: boolean;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  publishedBy: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  // Relations
  @ManyToOne(() => WorkflowTemplate, (template) => template.versions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workflowTemplateId' })
  workflowTemplate: WorkflowTemplate;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'publishedBy' })
  publisher: User;

  // Helper methods
  isLatest(): boolean {
    return this.workflowTemplate && this.versionNumber === this.workflowTemplate.version;
  }

  isPublished(): boolean {
    return this.isPublished;
  }

  canBePublished(): boolean {
    return !this.isPublished && this.workflowTemplate && this.workflowTemplate.status === 'draft';
  }

  getChangeSummary(): string {
    if (!this.changeLog || this.changeLog.length === 0) {
      return 'No changes';
    }

    const added = this.changeLog.filter(c => c.changeType === 'added').length;
    const modified = this.changeLog.filter(c => c.changeType === 'modified').length;
    const removed = this.changeLog.filter(c => c.changeType === 'removed').length;

    const changes = [];
    if (added > 0) changes.push(`${added} added`);
    if (modified > 0) changes.push(`${modified} modified`);
    if (removed > 0) changes.push(`${removed} removed`);

    return changes.join(', ');
  }

  getFullVersionName(): string {
    if (this.versionName) {
      return `v${this.versionNumber} - ${this.versionName}`;
    }
    return `v${this.versionNumber}`;
  }
}
