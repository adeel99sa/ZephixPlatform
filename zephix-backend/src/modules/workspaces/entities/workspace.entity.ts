import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
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

  // Relations
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @ManyToOne(() => Organization, organization => organization.workspaces)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToMany(() => Project, project => project.workspace)
  projects: Project[];

  @OneToMany(() => Team, team => team.workspace)
  teams: Team[];

  // @ManyToMany(() => User, user => user.workspaces)
  // users: User[];
}




