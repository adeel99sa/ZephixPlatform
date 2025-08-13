import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { TeamMember } from '../../projects/entities/team-member.entity';
import { RefreshToken } from '../../modules/auth/entities/refresh-token.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  emailVerifiedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => UserOrganization, (userOrg) => userOrg.user, {
    cascade: true,
  })
  userOrganizations: UserOrganization[];

  @OneToMany(() => TeamMember, (teamMember) => teamMember.user, {
    cascade: true,
  })
  teamMembers: TeamMember[];

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user, {
    cascade: true,
  })
  refreshTokens: RefreshToken[];
}
