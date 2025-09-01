import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Organization } from './organization.entity';

@Entity('organization_settings')
@Index('idx_org_settings_org_id', ['organizationId'], { unique: true })
export class OrganizationSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', unique: true })
  organizationId: string;

  @Column({ length: 50, default: 'UTC' })
  timezone: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, nullable: true, unique: true })
  domain: string;

  @Column('jsonb', { name: 'business_hours', default: {} })
  businessHours: Record<string, any>;

  @Column('jsonb', { default: {} })
  branding: Record<string, any>;

  @Column('jsonb', { name: 'default_project_settings', default: {} })
  defaultProjectSettings: Record<string, any>;

  @Column('jsonb', { name: 'notification_policies', default: {} })
  notificationPolicies: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}