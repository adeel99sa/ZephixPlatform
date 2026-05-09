import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
// import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { Task } from '../../projects/entities/task.entity';

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

  /** @deprecated Replaced by `mfaEnabled` (B1). Kept until cutover drop migration. */
  @Column({ name: 'two_factor_enabled', default: false })
  twoFactorEnabled: boolean;

  /** @deprecated Plaintext storage replaced by encrypted `mfaSecret*` set (B1). Drop in PR2. */
  @Column({ name: 'two_factor_secret', nullable: true })
  twoFactorSecret: string;

  // ── B1 RBAC: encrypted MFA (AES-256-GCM) ─────────────────────────────
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

  @Column({ name: 'email_verification_token', nullable: true })
  emailVerificationToken: string;

  @Column({ name: 'password_reset_token', nullable: true })
  passwordResetToken: string;

  @Column({
    name: 'last_password_change',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastPasswordChange: Date;

  @Column({
    name: 'email_verification_expires',
    nullable: true,
    type: 'timestamp',
  })
  emailVerificationExpires: Date;

  @Column({ name: 'password_reset_expires', nullable: true, type: 'timestamp' })
  passwordResetExpires: Date;

  // @OneToMany(() => RefreshToken, refreshToken => refreshToken.user)
  // refreshTokens: RefreshToken[];

  @OneToMany(() => Task, (task) => task.assignee)
  assignedTasks: Task[];
}
