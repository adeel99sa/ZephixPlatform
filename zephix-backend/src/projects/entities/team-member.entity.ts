import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Column,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Team } from './team.entity';
import { Role } from './role.entity';

@Entity('team_members')
@Index('IDX_TEAM_MEMBER_UNIQUE', ['teamId', 'userId'], { unique: true })
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Team, (team) => team.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ name: 'team_id' })
  teamId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Role, (role) => role.teamMembers, { nullable: false })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ name: 'role_id' })
  roleId: string;

  @Column({ type: 'timestamp', nullable: true })
  joinedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
