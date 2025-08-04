import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { TeamMember } from './team-member.entity';

export enum RoleType {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
  PROJECT_MANAGER = 'project_manager',
  DEVELOPER = 'developer',
  ANALYST = 'analyst',
}

@Entity('roles')
@Index('IDX_ROLE_NAME', ['name'])
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: RoleType,
    unique: true,
  })
  name: RoleType;

  @Column({ length: 500, nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  permissions: string[]; // Array of permission strings

  @OneToMany(() => TeamMember, (teamMember) => teamMember.role)
  teamMembers: TeamMember[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 