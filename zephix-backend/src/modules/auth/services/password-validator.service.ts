import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PasswordValidatorService {
  private commonPasswords: Set<string>;

  constructor() {
    // Load common passwords list
    const passwordsPath = path.join(__dirname, '../../../assets/common-passwords-10k.txt');
    try {
      const passwords = fs.readFileSync(passwordsPath, 'utf-8').split('\n');
      this.commonPasswords = new Set(passwords.map(p => p.toLowerCase().trim()));
    } catch (error) {
      console.warn('Could not load common passwords list:', error.message);
      this.commonPasswords = new Set();
    }
  }

  async validatePassword(password: string, email: string): Promise<void> {
    // Minimum length
    if (password.length < 10) {
      throw new BadRequestException('Password must be at least 10 characters');
    }

    // Check against common passwords
    if (this.commonPasswords.has(password.toLowerCase())) {
      throw new BadRequestException('Password is too common');
    }

    // Cannot contain email username
    const emailUsername = email.split('@')[0].toLowerCase();
    if (password.toLowerCase().includes(emailUsername)) {
      throw new BadRequestException('Password cannot contain your email');
    }

    // Must have complexity
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!(hasUpper && hasLower && hasNumber)) {
      throw new BadRequestException('Password must contain uppercase, lowercase, and numbers');
    }

    // Check for common patterns
    if (this.hasCommonPatterns(password)) {
      throw new BadRequestException('Password contains common patterns');
    }
  }

  private hasCommonPatterns(password: string): boolean {
    const patterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /abc123/i,
      /admin/i,
      /letmein/i,
      /welcome/i,
      /monkey/i,
      /dragon/i,
      /master/i,
    ];

    return patterns.some(pattern => pattern.test(password));
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12); // Cost factor 12
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
