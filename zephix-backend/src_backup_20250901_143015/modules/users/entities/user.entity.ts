import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { Organization } from '../organizations/entities/organization.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ name: 'email', unique: true })
  email: string;

  @Column({ name: 'password' })
  password: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ name: 'role', default: 'user' })
  role: string;

  @Column({ name: 'organization_id', nullable: true })
  organizationId?: string;

  @Column({ name: 'profile_picture', nullable: true })
  profilePicture?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_email_verified', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'email_verified_at', type: 'timestamp', nullable: true })
  emailVerifiedAt?: Date;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'reset_token', nullable: true })
  resetToken?: string;

  @Column({ name: 'reset_token_expiry', type: 'timestamp', nullable: true })
  resetTokenExpiry?: Date;

  @Column({ name: 'verification_token', nullable: true })
  verificationToken?: string;

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshToken[];
  @ManyToOne(
    () => Organization,
    (organization) => organization.userOrganizations,
  )
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
