import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UserMFA } from '../entities/user-mfa.entity';
import { User } from '../../users/entities/user.entity';

export interface MFASetupResponse {
  qrCode: string;
  backupCodes: string[];
  secret: string;
}

@Injectable()
export class MFAService {
  constructor(
    @InjectRepository(UserMFA)
    private mfaRepository: Repository<UserMFA>,
  ) {}

  async setupMFA(userId: string, userEmail: string): Promise<MFASetupResponse> {
    // Check if MFA already exists
    const existingMFA = await this.mfaRepository.findOne({ where: { userId } });
    if (existingMFA) {
      throw new BadRequestException('MFA already configured for this user');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Zephix (${userEmail})`,
      length: 32,
    });

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      randomBytes(4).toString('hex').toUpperCase()
    );

    // Hash backup codes for storage
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    );

    // Store in database
    await this.mfaRepository.save({
      userId,
      secret: secret.base32, // In production, encrypt this
      backupCodes: hashedBackupCodes,
      isEnabled: false,
      createdAt: new Date(),
    });

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    return {
      qrCode: qrCodeUrl,
      backupCodes,
      secret: secret.base32,
    };
  }

  async verifyMFA(userId: string, token: string): Promise<boolean> {
    const mfa = await this.mfaRepository.findOne({ where: { userId } });
    
    if (!mfa) {
      throw new NotFoundException('MFA not configured');
    }

    // Check TOTP token
    const verified = speakeasy.totp.verify({
      secret: mfa.secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 60 second window
    });

    if (verified) {
      // Update last used timestamp
      mfa.lastUsedAt = new Date();
      await this.mfaRepository.save(mfa);
      return true;
    }

    // Check backup codes
    for (const hashedCode of mfa.backupCodes) {
      const isBackupCode = await bcrypt.compare(token, hashedCode);
      if (isBackupCode) {
        // Remove used backup code
        mfa.backupCodes = mfa.backupCodes.filter(c => c !== hashedCode);
        mfa.lastUsedAt = new Date();
        await this.mfaRepository.save(mfa);
        return true;
      }
    }

    return false;
  }

  async enableMFA(userId: string, token: string): Promise<void> {
    const mfa = await this.mfaRepository.findOne({ where: { userId } });
    
    if (!mfa) {
      throw new NotFoundException('MFA not configured');
    }

    // Verify the token before enabling
    const isValid = await this.verifyMFA(userId, token);
    if (!isValid) {
      throw new BadRequestException('Invalid MFA token');
    }

    mfa.isEnabled = true;
    await this.mfaRepository.save(mfa);
  }

  async disableMFA(userId: string, password: string, userPasswordHash: string): Promise<void> {
    // Verify password before disabling MFA
    const isPasswordValid = await bcrypt.compare(password, userPasswordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid password');
    }

    await this.mfaRepository.delete({ userId });
  }

  async requiresMFA(user: User): Promise<boolean> {
    return user.organizationRole === 'admin' || (user as any).organizationRole === 'owner';
  }

  async isMFAEnabled(userId: string): Promise<boolean> {
    const mfa = await this.mfaRepository.findOne({ 
      where: { userId, isEnabled: true } 
    });
    return !!mfa;
  }

  async getMFAStatus(userId: string): Promise<{ isEnabled: boolean; hasBackupCodes: boolean }> {
    const mfa = await this.mfaRepository.findOne({ where: { userId } });
    
    if (!mfa) {
      return { isEnabled: false, hasBackupCodes: false };
    }

    return {
      isEnabled: mfa.isEnabled,
      hasBackupCodes: mfa.backupCodes && mfa.backupCodes.length > 0,
    };
  }
}
