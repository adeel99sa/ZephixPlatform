import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EmailVerification } from '../entities/email-verification.entity';
import { User } from "../../modules/users/entities/user.entity"
import { EmailService } from '../../shared/services/email.service';
import { randomBytes } from 'crypto';

export interface VerificationEmailData {
  recipientEmail: string;
  recipientName: string;
  verificationToken: string;
}

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);
  private readonly verificationRateLimit = new Map<string, number>();

  constructor(
    @InjectRepository(EmailVerification)
    private verificationRepository: Repository<EmailVerification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async sendVerificationEmail(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ success: boolean; token: string }> {
    // Rate limiting: max 3 verification emails per hour per user
    const rateLimitKey = `verification_${user.id}`;
    const currentTime = Date.now();
    const lastSent = this.verificationRateLimit.get(rateLimitKey) || 0;
    const hourInMs = 60 * 60 * 1000;

    if (currentTime - lastSent < hourInMs / 3) {
      const attempts = Array.from(this.verificationRateLimit.entries()).filter(
        ([key]) => key.startsWith(`verification_${user.id}_`),
      ).length;

      if (attempts >= 3) {
        throw new HttpException(
          'Too many verification emails sent. Please wait before requesting another.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Cancel any existing pending verifications
    await this.verificationRepository.update(
      {
        userId: user.id,
        status: 'pending',
      },
      { status: 'expired' },
    );

    // Generate secure verification token
    const token = this.generateVerificationToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    // Create verification record
    const verification = this.verificationRepository.create({
      token,
      email: user.email,
      userId: user.id,
      expiresAt,
      ipAddress,
      userAgent,
      status: 'pending',
    });

    await this.verificationRepository.save(verification);

    // Send verification email
    try {
      await this.sendVerificationEmailTemplate({
        recipientEmail: user.email,
        recipientName: `${user.firstName} ${user.lastName}`,
        verificationToken: token,
      });

      // Update rate limiting
      this.verificationRateLimit.set(rateLimitKey, currentTime);

      this.logger.log(`Verification email sent to ${user.email}`);
      return { success: true, token };
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${user.email}:`,
        error,
      );
      throw new BadRequestException('Failed to send verification email');
    }
  }

  async verifyEmail(
    token: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ success: boolean; user: User }> {
    const verification = await this.verificationRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!verification) {
      throw new NotFoundException('Invalid verification token');
    }

    if (!verification.isValid()) {
      if (verification.isExpired()) {
        verification.status = 'expired';
        await this.verificationRepository.save(verification);
        throw new BadRequestException('Verification token has expired');
      }
      throw new BadRequestException('Verification token is no longer valid');
    }

    // Mark verification as complete
    verification.status = 'verified';
    verification.verifiedAt = new Date();
    if (ipAddress) verification.ipAddress = ipAddress;
    if (userAgent) verification.userAgent = userAgent;

    await this.verificationRepository.save(verification);

    // Update user as verified
    const user = verification.user;
    user.isEmailVerified = true;
    user.isEmailVerified = true;
    await this.userRepository.save(user);

    this.logger.log(`Email verified for user ${user.email}`);
    return { success: true, user };
  }

  async resendVerificationEmail(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ success: boolean }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    await this.sendVerificationEmail(user, ipAddress, userAgent);
    return { success: true };
  }

  async checkVerificationStatus(userId: string): Promise<{
    isVerified: boolean;
    pendingVerification: boolean;
    lastSentAt?: Date;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const pendingVerification = await this.verificationRepository.findOne({
      where: { userId, status: 'pending' },
      order: { createdAt: 'DESC' },
    });

    return {
      isVerified: user.isEmailVerified,
      pendingVerification: !!pendingVerification,
      lastSentAt: pendingVerification?.createdAt,
    };
  }

  async getVerificationByToken(
    token: string,
  ): Promise<EmailVerification | null> {
    return this.verificationRepository.findOne({
      where: { token },
      relations: ['user'],
    });
  }

  private generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

  private async sendVerificationEmailTemplate(
    data: VerificationEmailData,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('app.frontendUrl') ||
      'http://localhost:5173';
    const verificationUrl = `${frontendUrl}/verify-email/${data.verificationToken}`;

    const subject = 'Verify your email address - Zephix';

    const html = this.generateVerificationEmailTemplate({
      ...data,
      verificationUrl,
    });

    const mailOptions = {
      from:
        this.configService.get<string>('email.fromAddress') ||
        'noreply@zephix.com',
      to: data.recipientEmail,
      subject,
      html,
    };

    // Use the EmailService that we already created
    await this.emailService.sendEmail(mailOptions);
  }

  private generateVerificationEmailTemplate(
    data: VerificationEmailData & { verificationUrl: string },
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - Zephix</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e1e5e9; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6c757d; border: 1px solid #e1e5e9; border-top: none; }
          .btn { display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; margin: 20px 0; font-size: 16px; }
          .btn:hover { background: #5a6fd8; }
          .warning-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .security-notice { background: #e3f2fd; border: 1px solid #bbdefb; padding: 15px; border-radius: 6px; margin: 20px 0; font-size: 14px; }
          .logo { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
          .verification-code { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; font-family: monospace; font-size: 24px; font-weight: bold; color: #667eea; margin: 20px 0; border: 2px dashed #667eea; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🚀 ZEPHIX</div>
            <h1>Verify Your Email Address</h1>
            <p>Welcome aboard! Let's get your account secured.</p>
          </div>
          
          <div class="content">
            <p>Hi ${data.recipientName},</p>
            
            <p>Thank you for joining <strong>Zephix</strong>, the modern project management platform trusted by teams worldwide.</p>
            
            <p>To complete your registration and secure your account, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${data.verificationUrl}" class="btn">Verify Email Address</a>
            </div>
            
            <div class="warning-box">
              <strong>⏰ Important:</strong> This verification link will expire in 24 hours for your security.
            </div>
            
            <div class="security-notice">
              <strong>🔒 Security Notice:</strong> You cannot log in to your Zephix account until your email address is verified. This helps protect your account and ensures important notifications reach you.
            </div>
            
            <hr>
            
            <p><strong>Can't click the button?</strong> Copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;"><a href="${data.verificationUrl}">${data.verificationUrl}</a></p>
            
            <hr>
            
            <p><strong>What happens next?</strong></p>
            <ul>
              <li>✅ Your email will be verified instantly</li>
              <li>🔓 You'll be able to log in to your account</li>
              <li>🎯 You can start managing projects with your team</li>
              <li>📧 You'll receive important notifications and updates</li>
            </ul>
          </div>
          
          <div class="footer">
            <p><strong>Need help?</strong> Contact our support team at support@zephix.com</p>
            <p>If you didn't create a Zephix account, you can safely ignore this email.</p>
            <p>&copy; 2024 Zephix. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
