import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../modules/organizations/entities/organization.entity';
import { WorkflowInstance } from './workflow-instance.entity';

export interface WorkflowStage {
  id: string;
  name: string;
  type: 'intake_stage' | 'project_phase' | 'approval_gate' | 'orr_section';
  required: boolean;
  automations: Array<{
    trigger: string;
    action: string;
    conditions: Record<string, any>;
  }>;
  approvers: string[];
  notifications: Array<{
    event: string;
    recipients: string[];
    template: string;
  }>;
}

export interface WorkflowField {
  id: string;
  name: string;
  type:
    | 'text'
    | 'number'
    | 'date'
    | 'select'
    | 'multiselect'
    | 'file'
    | 'textarea'
    | 'checkbox'
    | 'url'
    | 'email';
  required: boolean;
  options?: string[];
  validation?: Record<string, any>;
  placeholder?: string;
  helpText?: string;
}

export interface WorkflowIntegration {
  type: 'webhook' | 'email' | 'api';
  endpoint: string;
  events: string[];
  payload_template: Record<string, any>;
  headers?: Record<string, string>;
}

export interface WorkflowConfiguration {
  stages: WorkflowStage[];
  fields: WorkflowField[];
  integrations: WorkflowIntegration[];
  settings: {
    allowParallelExecution: boolean;
    autoProgressOnApproval: boolean;
    requireAllApprovals: boolean;
    notifyOnStageChange: boolean;
  };
}

@Entity('workflow_templates')
export class WorkflowTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['intake', 'project', 'orr', 'custom'],
    default: 'custom',
  })
  type: string;

  @Column({ type: 'jsonb', default: {} })
  configuration: WorkflowConfiguration;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    version: string;
    createdBy: string;
    lastModifiedBy: string;
    tags: string[];
    category: string;
  };

  @OneToMany(() => WorkflowInstance, (instance) => instance.template)
  instances: WorkflowInstance[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  getStageById(stageId: string): WorkflowStage | undefined {
    return this.configuration.stages.find((stage) => stage.id === stageId);
  }

  getFieldById(fieldId: string): WorkflowField | undefined {
    return this.configuration.fields.find((field) => field.id === fieldId);
  }

  isStageRequired(stageId: string): boolean {
    const stage = this.getStageById(stageId);
    return stage?.required ?? false;
  }

  getNextStage(currentStageId: string): WorkflowStage | null {
    const currentIndex = this.configuration.stages.findIndex(
      (s) => s.id === currentStageId,
    );
    if (
      currentIndex === -1 ||
      currentIndex >= this.configuration.stages.length - 1
    ) {
      return null;
    }
    return this.configuration.stages[currentIndex + 1];
  }

  getPreviousStage(currentStageId: string): WorkflowStage | null {
    const currentIndex = this.configuration.stages.findIndex(
      (s) => s.id === currentStageId,
    );
    if (currentIndex <= 0) {
      return null;
    }
    return this.configuration.stages[currentIndex - 1];
  }
}
