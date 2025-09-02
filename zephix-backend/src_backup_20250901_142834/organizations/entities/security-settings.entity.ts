// src/organizations/entities/security-settings.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from './organization.entity';

interface PasswordPolicy {
  minLength: number;
  requireNumbers: boolean;
  requireSymbols: boolean;
  requireUppercase: boolean;
  requireLowercase?: boolean;
  maxAge?: number; // days before password expires
}

@Entity('security_settings')
@Index('IDX_security_settings_org', ['organizationId'])
export class SecuritySettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organizationId', unique: true })
  organizationId: string;

  @Column({ name: 'twoFactorEnabled', default: false })
  twoFactorEnabled: boolean;

  @Column({ name: 'sessionTimeout', default: 480 }) // minutes
  sessionTimeout: number;

  @Column({
    name: 'passwordPolicy',
    type: 'jsonb',
    default: {
      minLength: 8,
      requireNumbers: true,
      requireSymbols: true,
      requireUppercase: true,
    },
  })
  passwordPolicy: PasswordPolicy;

  @Column({ name: 'ipWhitelist', type: 'text', array: true, nullable: true })
  ipWhitelist: string[];

  @Column({ name: 'maxFailedAttempts', default: 5 })
  maxFailedAttempts: number;

  @Column({ name: 'lockoutDuration', default: 30 }) // minutes
  lockoutDuration: number;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations
  @OneToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;
}
