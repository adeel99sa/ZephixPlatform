import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * Scoped policy overrides. Resolution order: Project > Workspace > Organization > System default.
 * - organizationId is always required (tenancy)
 * - workspaceId nullable → org-level override
 * - projectId nullable → workspace-level override
 * - Both null → org-level override
 */
@Entity('policy_overrides')
@Index(['organizationId'])
@Index(['workspaceId'])
@Index(['projectId'])
@Index(['policyKey'])
@Unique('UQ_policy_override_scope', ['policyKey', 'organizationId', 'workspaceId', 'projectId'])
export class PolicyOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120, name: 'policy_key' })
  policyKey: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id', nullable: true })
  workspaceId: string | null;

  @Column({ type: 'uuid', name: 'project_id', nullable: true })
  projectId: string | null;

  @Column({ type: 'jsonb' })
  value: any;

  @Column({ type: 'uuid', name: 'set_by_user_id' })
  setByUserId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
