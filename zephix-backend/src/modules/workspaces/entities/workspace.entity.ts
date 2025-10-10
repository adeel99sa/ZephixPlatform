import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  ManyToMany,
} from 'typeorm';
import { User } from '../../../modules/users/entities/user.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { Project } from '../../projects/entities/project.entity';
import { Team } from '../../teams/entities/team.entity';

@Entity('workspaces')
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subdomain: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Soft delete columns
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deletedBy?: string;

  // NEW: Hierarchy support
  @Column({ name: 'parent_workspace_id', type: 'uuid', nullable: true })
  parentWorkspaceId?: string;

  @Column({ name: 'workspace_type', type: 'varchar', length: 50, default: 'standard' })
  workspaceType: string;

  @Column({ name: 'hierarchy_level', type: 'int', default: 0 })
  hierarchyLevel: number;

  // @Column({ name: 'created_by', type: 'uuid', nullable: true })
  // createdBy?: string;

  // Relations
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'deleted_by' })
  deletedByUser?: User;

  @ManyToOne(() => Organization, organization => organization.workspaces)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToMany(() => Project, project => project.workspace)
  projects: Project[];

  @OneToMany(() => Team, team => team.workspace)
  teams: Team[];

  // NEW: Hierarchy relations
  @ManyToOne(() => Workspace, workspace => workspace.children, { nullable: true })
  @JoinColumn({ name: 'parent_workspace_id' })
  parent?: Workspace;

  @OneToMany(() => Workspace, workspace => workspace.parent)
  children: Workspace[];

  // @ManyToOne(() => User, { nullable: true })
  // @JoinColumn({ name: 'created_by' })
  // createdByUser?: User;

  @ManyToMany(() => User, user => user.workspaces)
  users: User[];
}




