import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { TeamMember } from './team-member.entity';
import { TeamVisibility } from '../../../shared/enums/team-visibility.enum';
import { WorkspaceScoped } from '../../tenancy/workspace-scoped.decorator';

@WorkspaceScoped() // Team has workspaceId (optional), so it's workspace-scoped
@Entity('teams')
@Index(['organizationId', 'isArchived'])
@Index(['organizationId', 'workspaceId'])
@Index(['organizationId', 'slug'], { unique: true })
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId?: string | null;

  @ManyToOne(() => Workspace, { nullable: true })
  @JoinColumn({ name: 'workspace_id' })
  workspace?: Workspace | null;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 10 })
  slug: string;

  @Column({ length: 7, nullable: true })
  color?: string | null;

  @Column({
    type: 'enum',
    enum: TeamVisibility,
    default: TeamVisibility.ORG,
  })
  visibility: TeamVisibility;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => TeamMember, (member) => member.team)
  members?: TeamMember[];
}

