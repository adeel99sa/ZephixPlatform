const { EntitySchema } = require('typeorm');
const bcrypt = require('bcryptjs');

// Plain JavaScript class for business logic
class User {
  constructor() {
    this.id = null;
    this.email = null;
    this.passwordHash = null;
    this.firstName = null;
    this.lastName = null;
    this.isActive = true;
    this.emailVerified = false;
    this.lastLoginAt = null;
    this.resetPasswordToken = null;
    this.resetPasswordExpires = null;
    this.createdAt = null;
    this.updatedAt = null;
  }

  // Business logic methods
  async setPassword(password) {
    const saltRounds = 12;
    this.passwordHash = await bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password) {
    return bcrypt.compare(password, this.passwordHash);
  }

  getFullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  isEmailVerified() {
    return this.emailVerified;
  }

  isAccountActive() {
    return this.isActive;
  }

  updateLastLogin() {
    this.lastLoginAt = new Date();
  }

  toJSON() {
    const { passwordHash, resetPasswordToken, ...safeUser } = this;
    return safeUser;
  }
}

// TypeORM Entity Schema
const UserEntity = new EntitySchema({
  name: 'User',
  target: User,
  tableName: 'users',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid'
    },
    email: {
      type: 'varchar',
      length: 255,
      unique: true,
      nullable: false
    },
    passwordHash: {
      type: 'varchar',
      name: 'password_hash',
      length: 255,
      nullable: false
    },
    firstName: {
      type: 'varchar',
      name: 'first_name',
      length: 100,
      nullable: false
    },
    lastName: {
      type: 'varchar',
      name: 'last_name',
      length: 100,
      nullable: false
    },
    isActive: {
      type: 'boolean',
      name: 'is_active',
      default: true
    },
    emailVerified: {
      type: 'boolean',
      name: 'email_verified',
      default: false
    },
    lastLoginAt: {
      type: 'timestamp',
      name: 'last_login_at',
      nullable: true
    },
    resetPasswordToken: {
      type: 'varchar',
      name: 'reset_password_token',
      length: 255,
      nullable: true
    },
    resetPasswordExpires: {
      type: 'timestamp',
      name: 'reset_password_expires',
      nullable: true
    },
    createdAt: {
      type: 'timestamp',
      name: 'created_at',
      createDate: true
    },
    updatedAt: {
      type: 'timestamp',
      name: 'updated_at',
      updateDate: true
    }
  },
  indices: [
    {
      name: 'IDX_USER_EMAIL',
      columns: ['email']
    },
    {
      name: 'IDX_USER_ACTIVE',
      columns: ['isActive']
    }
  ]
});

module.exports = { UserEntity, User }; 