import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Team } from './team.entity';
import { User } from '../../users/entities/user.entity';

export enum TeamRole {
  LEAD = 'lead',
  MEMBER = 'member',
  CONTRIBUTOR = 'contributor',
}

@Entity('team_members')
@Index(['teamId'])
@Index(['userId'])
@Index(['isActive'])
@Index(['role'])
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'team_id', type: 'uuid' })
  teamId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: TeamRole,
    default: TeamRole.MEMBER,
  })
  role: TeamRole;

  @Column({ name: 'joined_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Team, team => team.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Helper methods
  isLead(): boolean {
    return this.role === TeamRole.LEAD;
  }

  isMember(): boolean {
    return this.role === TeamRole.MEMBER;
  }

  isContributor(): boolean {
    return this.role === TeamRole.CONTRIBUTOR;
  }

  canManageTeam(): boolean {
    return this.role === TeamRole.LEAD;
  }

  canAssignTasks(): boolean {
    return [TeamRole.LEAD, TeamRole.MEMBER].includes(this.role);
  }
}
