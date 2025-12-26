import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { Project } from '../../modules/projects/entities/project.entity';
import { UserOrganization } from './user-organization.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ default: 'trial' })
  status: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  industry: string;

  @Column({ nullable: true })
  size: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true, name: 'trial_ends_at' }) trialEndsAt: Date;

  /**
   * Organization settings (JSONB)
   * Can include resourceManagementSettings with thresholds:
   * - warningThreshold (default: 80)
   * - criticalThreshold (default: 100)
   * - hardCap (default: 150)
   * - requireJustificationAbove (default: 100)
   */
  @Column({ type: 'jsonb', default: {} })
  settings: object;

  /**
   * If true, this organization's plan is managed internally by Zephix team
   * and self-serve plan changes should be blocked
   */
  @Column({ default: false, name: 'internal_managed' })
  internalManaged: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => UserOrganization, (userOrg) => userOrg.organization)
  userOrganizations: UserOrganization[];

  @OneToMany(() => User, (user) => user.organizationId)
  users: User[];

  @OneToMany(() => Project, (project) => project.organization)
  projects: Project[];

  // Methods
  isActive(): boolean {
    return this.status === 'active' || this.status === 'trial';
  }
}
