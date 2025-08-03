import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import * as bcrypt from 'bcryptjs';

@Entity('users')
@Index('IDX_USER_EMAIL', ['email'])
@Index('IDX_USER_RESET_TOKEN', ['resetPasswordToken'])
@Index('IDX_USER_ACTIVE', ['isActive'])
@Index('IDX_USER_CREATED_AT', ['createdAt'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resetPasswordToken!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Business logic methods
  async setPassword(password: string): Promise<void> {
    const saltRounds = 12;
    this.passwordHash = await bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  isEmailVerified(): boolean {
    return this.emailVerified;
  }

  isAccountActive(): boolean {
    return this.isActive;
  }

  updateLastLogin(): void {
    this.lastLoginAt = new Date();
  }

  setResetPasswordToken(token: string, expiresInHours: number = 24): void {
    this.resetPasswordToken = token;
    this.resetPasswordExpires = new Date(
      Date.now() + expiresInHours * 60 * 60 * 1000
    );
  }

  clearResetPasswordToken(): void {
    this.resetPasswordToken = null;
    this.resetPasswordExpires = null;
  }

  isResetTokenValid(): boolean {
    if (!this.resetPasswordToken || !this.resetPasswordExpires) {
      return false;
    }
    return this.resetPasswordExpires > new Date();
  }

  // Convert to safe JSON (exclude password hash)
  toJSON(): Partial<UserEntity> {
    const { passwordHash, resetPasswordToken, ...safeUser } = this;
    return safeUser;
  }

  // Static factory methods
  static async create(
    email: string,
    firstName: string,
    lastName: string,
    password: string
  ): Promise<UserEntity> {
    const user = new UserEntity();
    user.email = email.toLowerCase();
    user.firstName = firstName;
    user.lastName = lastName;
    user.isActive = true;
    user.emailVerified = false;
    await user.setPassword(password);
    return user;
  }

  static fromDatabase(data: any): UserEntity {
    const user = new UserEntity();
    user.id = data.id;
    user.email = data.email;
    user.passwordHash = data.passwordHash;
    user.firstName = data.firstName;
    user.lastName = data.lastName;
    user.isActive = data.isActive;
    user.emailVerified = data.emailVerified;
    user.lastLoginAt = data.lastLoginAt ? new Date(data.lastLoginAt) : null;
    user.resetPasswordToken = data.resetPasswordToken;
    user.resetPasswordExpires = data.resetPasswordExpires ? new Date(data.resetPasswordExpires) : null;
    user.createdAt = new Date(data.createdAt);
    user.updatedAt = new Date(data.updatedAt);
    return user;
  }

  toDatabase(): any {
    return {
      id: this.id,
      email: this.email,
      passwordHash: this.passwordHash,
      firstName: this.firstName,
      lastName: this.lastName,
      isActive: this.isActive,
      emailVerified: this.emailVerified,
      lastLoginAt: this.lastLoginAt,
      resetPasswordToken: this.resetPasswordToken,
      resetPasswordExpires: this.resetPasswordExpires,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
} 