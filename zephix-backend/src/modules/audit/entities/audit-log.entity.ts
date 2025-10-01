import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  USER_REGISTERED = 'USER_REGISTERED',
  USER_REGISTRATION_FAILED = 'USER_REGISTRATION_FAILED',
  USER_UPDATE = 'USER_UPDATE',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',
  TOKEN_REFRESHED = 'TOKEN_REFRESHED',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  PERMISSION_GRANT = 'PERMISSION_GRANT',
  PERMISSION_REVOKE = 'PERMISSION_REVOKE',
  RESOURCE_ACCESS = 'RESOURCE_ACCESS',
  RESOURCE_CREATED = 'RESOURCE_CREATED',
  RESOURCE_UPDATED = 'RESOURCE_UPDATED',
  RESOURCE_UPDATE = 'RESOURCE_UPDATE',
  RESOURCE_DELETED = 'RESOURCE_DELETED',
  RESOURCE_ALLOCATE = 'RESOURCE_ALLOCATE',
  RESOURCE_DEALLOCATE = 'RESOURCE_DEALLOCATE',
}

export enum ResourceType {
  USER = 'USER',
  PROJECT = 'PROJECT',
  TEAM = 'TEAM',
  WORKSPACE = 'WORKSPACE',
  RESOURCE = 'RESOURCE',
  ORGANIZATION = 'ORGANIZATION',
  PERMISSION = 'PERMISSION',
}

@Entity('audit_logs')
@Index(['timestamp'])
@Index(['actorId'])
@Index(['action'])
@Index(['correlationId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ name: 'correlation_id', type: 'varchar', length: 255 })
  correlationId: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  target: string;

  @Column({ type: 'varchar', length: 50 })
  result: 'success' | 'failure' | 'error';

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;
}