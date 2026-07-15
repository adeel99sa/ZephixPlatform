import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';

/**
 * Workspace-level governance policy override.
 * Resolution order: explicit row (this table) → complexity-mode bundle default → DISABLED.
 * No DEFAULT-true semantics: absence of a row means "consult bundle or DISABLED".
 */
@Entity('workspace_policies')
@Unique('uq_ws_policy_code', ['workspaceId', 'policyCode'])
@Index('idx_ws_policy_org_ws', ['organizationId', 'workspaceId'])
export class WorkspaceGovPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'varchar', length: 120, name: 'policy_code' })
  policyCode: string;

  @Column({ type: 'boolean', name: 'is_enabled' })
  isEnabled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  params: Record<string, any> | null;

  /**
   * SKIP-1 (Type A): the actor who last toggled this policy. Nullable — historical
   * rows predate the column and carry NULL (actor genuinely unknown, not faked).
   * The authoritative actor+before/after trail is the paired audit_events row
   * (GOVERNANCE_EVALUATE / governanceType WORKSPACE_POLICY_TOGGLED); this column
   * is a convenience denormalization of the current owner.
   */
  @Column({ type: 'uuid', name: 'updated_by', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
