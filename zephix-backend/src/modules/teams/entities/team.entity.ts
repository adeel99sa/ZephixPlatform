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
import { User } from '../../users/entities/user.entity';
import { TeamMember } from './team-member.entity';
import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';
import { Resource } from '../../resources/entities/resource.entity';

@Entity('teams')
@Index(['organizationId'])
@Index(['workspaceId'])
@Index(['isActive'])
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId: string;

  @Column({ name: 'team_lead_id', type: 'uuid', nullable: true })
  teamLeadId: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Workspace, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'team_lead_id' })
  teamLead: User;

  @OneToMany(() => TeamMember, member => member.team)
  members: TeamMember[];

  // Note: These relationships will be available after migration
  // @OneToMany(() => Project, project => project.team)
  // projects: Project[];

  // @OneToMany(() => Task, task => task.team)
  // tasks: Task[];

  // @OneToMany(() => Resource, resource => resource.team)
  // resources: Resource[];

  // Helper methods
  getMemberCount(): number {
    return this.members ? this.members.filter(m => m.isActive).length : 0;
  }

  getActiveProjects(): Project[] {
    // return this.projects ? this.projects.filter(p => p.status === 'active') : [];
    return []; // TODO: Implement after migration
  }

  getTotalCapacity(): number {
    // Calculate total capacity from team members who are resources
    if (!this.members) return 0;
    
    return this.members
      .filter(member => member.isActive && member.user)
      .reduce((total, member) => {
        // Each active team member contributes 40 hours per week by default
        // In a real implementation, this would query the Resource entity
        // For now, we'll use a standard capacity per active member
        return total + 40;
      }, 0);
  }

  getCurrentAllocation(): number {
    // Calculate current allocation from team members
    if (!this.members) return 0;
    
    return this.members
      .filter(member => member.isActive && member.user)
      .reduce((total, member) => {
        // Each active team member is assumed to be 50% allocated by default
        // In a real implementation, this would query ResourceAllocation entities
        return total + 20; // 50% of 40 hours = 20 hours
      }, 0);
  }

  isOverallocated(): boolean {
    return this.getCurrentAllocation() > this.getTotalCapacity();
  }
}
