import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'documents' })
@Index(['workspaceId', 'projectId'])
@Index(['projectId', 'updatedAt'])
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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
