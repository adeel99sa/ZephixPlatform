import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
// import { RefreshToken } from '../../auth/entities/refresh-token.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'email', unique: true })
  email: string;

  /** Google OAuth `sub`; partial unique index in DB (see migrations). */
  @Column({ name: 'google_id', nullable: true, type: 'varchar', length: 255 })
  googleId: string | null;

  @Column({ name: 'password' })
  password: string;

  // 👇 Explicitly map snake_case DB columns to camelCase properties
  @Column({ name: 'first_name', nullable: true })
  firstName: string | null;

  @Column({ name: 'last_name', nullable: true })
  lastName: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'is_email_verified', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'email_verified_at', nullable: true, type: 'timestamp' })
  emailVerifiedAt: Date;

  @Column({ default: 'user' })
  role: string;

  @Column({ name: 'organization_id', nullable: true, type: 'uuid' })
  organizationId: string;

  @Column({ name: 'profile_picture', nullable: true })
  profilePicture: string;

  @Column({ name: 'last_login_at', nullable: true, type: 'timestamp' })
  lastLoginAt: Date;

  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', nullable: true, type: 'timestamp' })
  lockedUntil: Date;

  // ── B1 RBAC: encrypted MFA (AES-256-GCM) ─────────────────────────────
  // Note (A10, migration 18000000000180): the prior `two_factor_enabled`
  // and `two_factor_secret` columns were dropped here. Both were marked
  // @deprecated in favor of the encrypted `mfa_*` set below and had zero
  // non-entity reads at drop time.
  @Column({ name: 'mfa_enabled', type: 'boolean', default: false })
  mfaEnabled: boolean;

  @Column({ name: 'mfa_secret_ciphertext', type: 'bytea', nullable: true })
  mfaSecretCiphertext: Buffer | null;

  @Column({ name: 'mfa_secret_iv', type: 'bytea', nullable: true })
  mfaSecretIv: Buffer | null;

  @Column({ name: 'mfa_secret_auth_tag', type: 'bytea', nullable: true })
  mfaSecretAuthTag: Buffer | null;

  /** Set on first admin login post-B1 deploy. After this timestamp, sensitive endpoints require MFA. */
  @Column({ name: 'mfa_grace_until', type: 'timestamptz', nullable: true })
  mfaGraceUntil: Date | null;

  // Note (A10, migration 18000000000180): the prior inline
  // `email_verification_token`, `email_verification_expires`,
  // `password_reset_token`, and `password_reset_expires` columns were
  // dropped here. Both flows are owned by the dedicated
  // `email_verification_tokens` and `password_reset_tokens` tables;
  // the inline columns had zero non-entity reads at drop time.
  @Column({
    name: 'last_password_change',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastPasswordChange: Date;

  // @OneToMany(() => RefreshToken, refreshToken => refreshToken.user)
  // refreshTokens: RefreshToken[];
}
