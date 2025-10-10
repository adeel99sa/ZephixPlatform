import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, ManyToMany } from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })  
  lastName: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_email_verified', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'email_verified_at', nullable: true })
  emailVerifiedAt: Date;

  @Column({ default: 'user' })
  role: string;

  @Column({ name: 'organization_id', nullable: true })
  organizationId: string;

  @Column({ name: 'organization_role', default: 'member' })
  organizationRole: string;

  @Column({ name: 'current_workspace_id', nullable: true })
  currentWorkspaceId: string;

  @Column({ name: 'profile_picture', nullable: true })
  profilePicture: string;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt: Date;

  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', nullable: true })
  lockedUntil: Date;

  @Column({ name: 'two_factor_enabled', default: false })
  twoFactorEnabled: boolean;

  @Column({ name: 'two_factor_secret', nullable: true })
  twoFactorSecret: string;

  @Column({ name: 'email_verification_token', nullable: true })
  emailVerificationToken: string;

  @Column({ name: 'email_verification_expires', nullable: true })
  emailVerificationExpires: Date;

  @Column({ name: 'password_reset_token', nullable: true })
  passwordResetToken: string;

  @Column({ name: 'password_reset_expires', nullable: true })
  passwordResetExpires: Date;

  @Column({ name: 'last_password_change', nullable: true })
  lastPasswordChange: Date;

  @Column({ name: 'invited_by', nullable: true })
  invitedBy: string;

  @Column({ name: 'invitation_token', nullable: true })
  invitationToken: string;

  @Column({ name: 'invitation_expires', nullable: true })
  invitationExpires: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToMany(() => Workspace, workspace => workspace.users)
  workspaces: Workspace[];

  @ManyToOne(() => Workspace, { nullable: true })
  @JoinColumn({ name: 'current_workspace_id' })
  currentWorkspace: Workspace;
}