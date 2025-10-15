import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
  ManyToOne, OneToMany, Index
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { Project } from '../../../modules/projects/entities/project.entity';

@Entity('workspace_folders')
@Index('uq_workspace_folders_root_per_workspace',
  ['workspaceId'],
  { unique: true, where: '"parent_folder_id" IS NULL AND "deleted_at" IS NULL' }
)
export class Folder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE', nullable: false })
  workspace: Workspace;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'uuid', name: 'parent_folder_id', nullable: true })
  parentFolderId?: string | null;

  @OneToMany(() => Project, (p) => p.folder, { cascade: false })
  projects: Project[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt?: Date | null;
}
