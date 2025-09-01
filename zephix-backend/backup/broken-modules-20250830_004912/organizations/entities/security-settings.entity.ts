import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Organization } from './organization.entity';

@Entity('security_settings')
@Index('idx_security_settings_org_id', ['organizationId'], { unique: true })
export class SecuritySettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', unique: true })
  organizationId: string;

  @Column('jsonb', { name: 'password_policy', default: {} })
  passwordPolicy: Record<string, any>;

  @Column('jsonb', { name: 'session_policy', default: {} })
  sessionPolicy: Record<string, any>;

  @Column('jsonb', { name: 'ip_restrictions', default: {} })
  ipRestrictions: Record<string, any>;

  @Column('jsonb', { name: 'two_factor_policy', default: {} })
  twoFactorPolicy: Record<string, any>;

  @Column('jsonb', { name: 'audit_settings', default: {} })
  auditSettings: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}