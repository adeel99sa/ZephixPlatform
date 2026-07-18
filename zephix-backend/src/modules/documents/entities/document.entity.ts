import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkspaceScoped } from '../../tenancy/workspace-scoped.decorator';

@WorkspaceScoped()
@Entity({ name: 'documents' })
@Index(['organizationId'])
@Index(['workspaceId', 'projectId'])
@Index(['projectId', 'updatedAt'])
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // DOC-TENANT-1: standalone documents carried no org column, so the
  // TenantAwareRepository guardrail could not scope them. Reads/writes trusted
  // the URL workspace/project alone, allowing cross-org access via a divergent
  // x-workspace-id header. This column brings documents under tenant isolation.
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId!: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  content!: Record<string, unknown>;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ type: 'uuid', name: 'created_by_user_id' })
  createdByUserId!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
