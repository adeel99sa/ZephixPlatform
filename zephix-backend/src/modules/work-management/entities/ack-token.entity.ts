import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Acknowledgement token for reporting-impact edits
 * Single-use tokens that bind to specific operations
 */
@Entity('ack_tokens')
@Index(['organizationId', 'workspaceId', 'projectId'])
@Index(['tokenHash'], { unique: true })
@Index(['expiresAt'])
export class AckToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 100, name: 'operation_code' })
  operationCode: string; // e.g., 'MILESTONE_PHASE_RENAME', 'MILESTONE_DUE_DATE_CHANGE'

  @Column({ type: 'uuid', name: 'target_entity_id' })
  targetEntityId: string; // Phase ID or Task ID

  @Column({ type: 'varchar', length: 64, name: 'token_hash', unique: true })
  tokenHash: string; // SHA-256 hash of the token

  @Column({ type: 'varchar', length: 64, name: 'payload_hash' })
  payloadHash: string; // Hash of the requested change payload

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamp', name: 'used_at', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
