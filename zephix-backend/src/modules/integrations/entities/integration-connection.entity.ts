import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';

@Entity('integration_connections')
@Index(['organizationId', 'type', 'baseUrl'], { unique: true })
@Index(['organizationId'])
export class IntegrationConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 50 })
  type: 'jira' | 'linear' | 'github';

  @Column({ name: 'base_url', type: 'varchar', length: 500 })
  baseUrl: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ name: 'auth_type', type: 'varchar', length: 50 })
  authType: 'api_token' | 'oauth' | 'basic';

  @Column({ name: 'encrypted_secrets', type: 'jsonb' })
  encryptedSecrets: {
    apiToken?: string;
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
  };

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ name: 'polling_enabled', type: 'boolean', default: false })
  pollingEnabled: boolean;

  @Column({ name: 'webhook_enabled', type: 'boolean', default: false })
  webhookEnabled: boolean;

  @Column({ name: 'project_mappings', type: 'jsonb', nullable: true })
  projectMappings?: Array<{
    externalProjectKey: string;
    zephixProjectId?: string;
    zephixWorkspaceId?: string;
  }>;

  @Column({ name: 'jql_filter', type: 'text', nullable: true })
  jqlFilter?: string;

  @Column({ name: 'last_polled_at', type: 'timestamp', nullable: true })
  lastPolledAt?: Date;

  @Column({ name: 'last_issue_updated_at', type: 'timestamp', nullable: true })
  lastIssueUpdatedAt?: Date;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: 'active' | 'error' | 'paused';

  @Column({ name: 'error_count', type: 'integer', default: 0 })
  errorCount: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string;

  @Column({
    name: 'webhook_secret',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  webhookSecret?: string;

  @Column({ name: 'last_sync_run_at', type: 'timestamp', nullable: true })
  lastSyncRunAt?: Date;

  @Column({
    name: 'last_sync_status',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  lastSyncStatus?: 'success' | 'error' | 'partial';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
