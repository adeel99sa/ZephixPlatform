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
import { Organization } from '../../organizations/entities/organization.entity';
import { IntakeForm } from './intake-form.entity';
import { WorkflowInstance } from './workflow-instance.entity';
import { User } from '../../users/entities/user.entity';

export interface SubmissionData {
  formData: Record<string, any>;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    submissionTime: Date;
    timeToComplete?: number; // in seconds
  };
  attachments?: Array<{
    fieldId: string;
    files: Array<{
      id: string;
      name: string;
      size: number;
      type: string;
      url: string;
    }>;
  }>;
}

@Entity('intake_submissions')
export class IntakeSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => IntakeForm, (form) => form.submissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'formId' })
  form: IntakeForm;

  @Column('uuid')
  formId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'processed', 'rejected', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Column({ type: 'jsonb' })
  data: SubmissionData;

  @Column({ nullable: true })
  submitterName: string;

  @Column({ nullable: true })
  submitterEmail: string;

  @Column({ nullable: true })
  submitterPhone: string;

  @Column('uuid', { nullable: true })
  submittedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'submittedBy' })
  submitter: User;

  @Column('uuid', { nullable: true })
  assignedTo: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedTo' })
  assignedUser: User;

  @Column('uuid', { nullable: true })
  processedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'processedBy' })
  processor: User;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @Column({ type: 'text', nullable: true })
  processingNotes: string;

  @ManyToOne(() => WorkflowInstance, { nullable: true })
  @JoinColumn({ name: 'workflowInstanceId' })
  workflowInstance: WorkflowInstance;

  @Column('uuid', { nullable: true })
  workflowInstanceId: string;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  })
  priority: string;

  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @Column({ type: 'jsonb', default: {} })
  automationResults: {
    notifications?: Array<{
      type: string;
      recipient: string;
      status: 'sent' | 'failed';
      timestamp: Date;
      error?: string;
    }>;
    integrations?: Array<{
      type: string;
      endpoint: string;
      status: 'success' | 'failed';
      timestamp: Date;
      response?: any;
      error?: string;
    }>;
    assignments?: Array<{
      assignedTo: string;
      reason: string;
      timestamp: Date;
    }>;
  };

  @CreateDateColumn()
  @Index('IDX_intake_submission_created_at')
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  getSubmitterIdentifier(): string {
    if (this.submitter) {
      return (
        this.submitter.email ||
        `${this.submitter.firstName} ${this.submitter.lastName}`.trim() ||
        'Unknown User'
      );
    }
    return this.submitterEmail || this.submitterName || 'Anonymous';
  }

  getFormValue(fieldId: string): any {
    return this.data.formData[fieldId];
  }

  getRequiredFieldValues(): Record<string, any> {
    // This would need the form's schema to determine required fields
    // For now, return common required fields
    return {
      title: this.title,
      description: this.description,
      submitterName: this.submitterName,
      submitterEmail: this.submitterEmail,
    };
  }

  getAttachmentsForField(fieldId: string): any[] {
    const fieldAttachments = this.data.attachments?.find(
      (att) => att.fieldId === fieldId,
    );
    return fieldAttachments?.files || [];
  }

  getAllAttachments(): any[] {
    return this.data.attachments?.flatMap((att) => att.files) || [];
  }

  isProcessed(): boolean {
    return this.status === 'processed';
  }

  isPending(): boolean {
    return this.status === 'pending';
  }

  canBeProcessed(): boolean {
    return ['pending', 'processing'].includes(this.status);
  }

  markAsProcessed(processorId: string, notes?: string): void {
    this.status = 'processed';
    this.processedBy = processorId;
    this.processedAt = new Date();
    if (notes) {
      this.processingNotes = notes;
    }
  }

  getTimeToComplete(): number | null {
    return this.data.metadata.timeToComplete || null;
  }

  addAutomationResult(
    type: 'notification' | 'integration' | 'assignment',
    result: any,
  ): void {
    if (!this.automationResults) {
      this.automationResults = {};
    }

    const key = `${type}s`;
    if (!this.automationResults[key]) {
      this.automationResults[key] = [];
    }

    (this.automationResults[key] as any[]).push({
      ...result,
      timestamp: new Date(),
    });
  }
}
