// src/organizations/entities/organization-settings.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, Index } from 'typeorm';
import { Organization } from './organization.entity';

interface BusinessHours {
  start: string; // "09:00"
  end: string;   // "17:00"
  days: number[]; // [1,2,3,4,5] - Monday to Friday
}

interface BrandingConfig {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  companyName?: string;
}

@Entity('organization_settings')
@Index('IDX_organization_settings_org', ['organizationId'])
export class OrganizationSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organizationId', unique: true })
  organizationId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, nullable: true })
  domain: string;

  @Column({ length: 50, default: 'UTC' })
  timezone: string;

  @Column({ length: 10, default: 'en' })
  language: string;

  @Column({ name: 'dateFormat', length: 20, default: 'MM/dd/yyyy' })
  dateFormat: string;

  @Column({ length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'jsonb', default: {} })
  branding: BrandingConfig;

  @Column({ 
    name: 'businessHours',
    type: 'jsonb', 
    default: { start: "09:00", end: "17:00", days: [1,2,3,4,5] } 
  })
  businessHours: BusinessHours;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @OneToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;
}