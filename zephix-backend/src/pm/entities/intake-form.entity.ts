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
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { WorkflowTemplate } from './workflow-template.entity';
import { IntakeSubmission } from './intake-submission.entity';

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect' | 'file' | 'checkbox' | 'radio' | 'url' | 'email' | 'phone';
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  conditional?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  };
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: string[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface FormSchema {
  fields: FormField[];
  sections: FormSection[];
  layout: 'single_column' | 'two_column' | 'tabs';
  styling: {
    theme: 'default' | 'dark' | 'light' | 'custom';
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
  };
}

export interface FormSettings {
  requireLogin: boolean;
  allowAnonymous: boolean;
  confirmationMessage: string;
  redirectUrl?: string;
  emailNotifications: string[];
  autoAssign?: {
    enabled: boolean;
    assignTo: string;
    rules?: Array<{
      field: string;
      operator: string;
      value: any;
      assignTo: string;
    }>;
  };
  integrations?: {
    slackWebhook?: string;
    teamsWebhook?: string;
    customWebhooks?: Array<{
      name: string;
      url: string;
      headers?: Record<string, string>;
    }>;
  };
}

@Entity('intake_forms')
export class IntakeForm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column()
  name: string;

  @Column({ unique: true })
  @Index('IDX_intake_form_slug', { unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  thankYouMessage: string;

  @Column({ type: 'jsonb' })
  formSchema: FormSchema;

  @ManyToOne(() => WorkflowTemplate, { nullable: true })
  @JoinColumn({ name: 'targetWorkflowId' })
  targetWorkflow: WorkflowTemplate;

  @Column('uuid', { nullable: true })
  targetWorkflowId: string;

  @Column({ default: true })
  isPublic: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', default: {} })
  settings: FormSettings;

  @Column({ type: 'jsonb', default: {} })
  analytics: {
    totalViews: number;
    totalSubmissions: number;
    conversionRate: number;
    lastSubmissionAt?: Date;
    popularFields?: Record<string, number>;
  };

  @OneToMany(() => IntakeSubmission, submission => submission.form)
  submissions: IntakeSubmission[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  getFieldById(fieldId: string): FormField | undefined {
    return this.formSchema.fields.find(field => field.id === fieldId);
  }

  getSectionById(sectionId: string): FormSection | undefined {
    return this.formSchema.sections.find(section => section.id === sectionId);
  }

  getRequiredFields(): FormField[] {
    return this.formSchema.fields.filter(field => field.required);
  }

  validateFieldValue(fieldId: string, value: any): { isValid: boolean; error?: string } {
    const field = this.getFieldById(fieldId);
    if (!field) {
      return { isValid: false, error: 'Field not found' };
    }

    if (field.required && (value === null || value === undefined || value === '')) {
      return { isValid: false, error: `${field.label} is required` };
    }

    if (field.validation) {
      const { min, max, pattern, message } = field.validation;

      if (min !== undefined && value < min) {
        return { isValid: false, error: message || `Value must be at least ${min}` };
      }

      if (max !== undefined && value > max) {
        return { isValid: false, error: message || `Value must be at most ${max}` };
      }

      if (pattern && typeof value === 'string' && !new RegExp(pattern).test(value)) {
        return { isValid: false, error: message || 'Invalid format' };
      }
    }

    return { isValid: true };
  }

  shouldShowField(fieldId: string, formData: Record<string, any>): boolean {
    const field = this.getFieldById(fieldId);
    if (!field?.conditional) return true;

    const { field: conditionField, operator, value } = field.conditional;
    const fieldValue = formData[conditionField];

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'contains':
        return Array.isArray(fieldValue) ? fieldValue.includes(value) : String(fieldValue).includes(value);
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      default:
        return true;
    }
  }

  getPublicUrl(): string {
    return `/intake/${this.slug}`;
  }

  incrementViews(): void {
    if (!this.analytics) {
      this.analytics = { totalViews: 0, totalSubmissions: 0, conversionRate: 0 };
    }
    this.analytics.totalViews++;
  }

  incrementSubmissions(): void {
    if (!this.analytics) {
      this.analytics = { totalViews: 0, totalSubmissions: 0, conversionRate: 0 };
    }
    this.analytics.totalSubmissions++;
    this.analytics.lastSubmissionAt = new Date();
    this.analytics.conversionRate = this.analytics.totalViews > 0 
      ? (this.analytics.totalSubmissions / this.analytics.totalViews) * 100 
      : 0;
  }
}
