import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
// import { Project } from '../../projects/entities/project.entity'; // Circular dependency - using forward reference
import { User } from '../../users/entities/user.entity';

@Entity('workspace_folders')
export class Folder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id' })
  workspaceId: string;

  @Column({ name: 'parent_folder_id', nullable: true })
  parentFolderId?: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 7, nullable: true })
  color?: string;

  @Column({ length: 50, nullable: true })
  icon?: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'hierarchy_depth', default: 0 })
  hierarchyDepth: number;

  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'deleted_by', nullable: true })
  deletedBy?: string;

  // Relations
  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @ManyToOne(() => Folder, folder => folder.children, { nullable: true })
  @JoinColumn({ name: 'parent_folder_id' })
  parent?: Folder;

  @OneToMany(() => Folder, folder => folder.parent)
  children: Folder[];

  @OneToMany('Project', 'folder')
  projects: any[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
