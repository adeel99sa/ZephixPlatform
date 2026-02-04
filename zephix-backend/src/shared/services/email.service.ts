const sgMail = require('@sendgrid/mail');
import { Injectable } from '@nestjs/common';
import { bootLog } from '../../common/utils/debug-boot';

// Module-scoped flag to ensure SendGrid log only prints once per process
let sendGridLoggedOnce = false;

export interface InvitationEmailData {
  recipientEmail: string;
  inviterName: string;
  organizationName: string;
  invitationToken: string; // This is what's passed
  // invitationLink: string;  // REMOVE - not passed
  role: string;
  message?: string;
  expiresAt: Date;
}

@Injectable()
export class EmailService {
  private isConfigured = false;

  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.isConfigured = true;
      if (!sendGridLoggedOnce) {
        bootLog('SendGrid configured');
        sendGridLoggedOnce = true;
      }
    } else if (!sendGridLoggedOnce) {
      console.warn('SendGrid API key not found - emails will not be sent');
      sendGridLoggedOnce = true;
    }
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    from?: string;
  }): Promise<void> {
    if (!this.isConfigured) {
      console.log('Email not sent (no SendGrid key):', options.subject);
      return;
    }

    // Debug what we received
    console.log('SendEmail called with:', {
      to: options.to,
      subject: options.subject,
      hasHtml: !!options.html,
      htmlLength: options.html?.length || 0,
      first100Chars: options.html?.substring(0, 100),
    });

    // Ensure we have content
    const htmlContent =
      options.html ||
      `
      <html>
        <body>
          <h2>${options.subject}</h2>
          <p>This is a verification email for ${options.to}</p>
          <p>If you did not request this, please ignore this email.</p>
        </body>
      </html>
    `;

    const msg = {
      to: options.to,
      from:
        options.from || process.env.SENDGRID_FROM_EMAIL || 'noreply@zephix.dev',
      subject: options.subject,
      html: htmlContent,
      text: options.text || options.subject,
    };

    try {
      await sgMail.send(msg);
      console.log('Email sent successfully to:', options.to);
    } catch (error: any) {
      console.error('SendGrid error:', error?.response?.body || error);
      throw new Error('Failed to send email');
    }
  }

  async sendInvitationEmail(data: InvitationEmailData): Promise<void> {
    // BUILD the link from the token
    const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/invitations/${data.invitationToken}`;

    const html = `
      <h2>You're invited to join ${data.organizationName}</h2>
      <p>${data.inviterName} has invited you to join as ${data.role}.</p>
      ${data.message ? `<p>Message: ${data.message}</p>` : ''}
      <p>This invitation expires on ${new Date(data.expiresAt).toLocaleDateString()}</p>
      <a href="${invitationLink}">Accept Invitation</a>
    `;

    await this.sendEmail({
      to: data.recipientEmail,
      subject: `Invitation to join ${data.organizationName}`,
      html,
    });
  }

  async sendWaitlistWelcome(
    email: string,
    name: string,
    position: number,
  ): Promise<void> {
    const html = `
      <h2>Welcome to Zephix, ${name}!</h2>
      <p>Thank you for joining our waitlist. You are currently in position ${position}.</p>
      <p>We'll notify you as soon as your spot opens up!</p>
      <p>Best regards,<br>The Zephix Team</p>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Welcome to Zephix Waitlist!',
      html,
    });
  }

  // Authentication-related email methods
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table align="center" width="600" style="margin: 20px auto; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #5850EC 0%, #6366F1 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: white; font-size: 28px;">Welcome to Zephix!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #1F2937;">Verify Your Email Address</h2>
              <p style="margin: 0 0 30px; color: #4B5563; font-size: 16px;">
                Thank you for signing up! Please confirm your email address by clicking the button below.
              </p>
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 6px; background: #5850EC;">
                    <a href="${verificationUrl}" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 600; color: white; text-decoration: none;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 10px; color: #6B7280; font-size: 14px;">
                Or copy this link: ${verificationUrl}
              </p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                This link expires in 24 hours. If you didn't create an account, please ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Verify your Zephix account',
      html,
      text: `Welcome to Zephix! Please verify your email by visiting: ${verificationUrl}`,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table align="center" width="600" style="margin: 20px auto; background: white; border-radius: 8px;">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: #DC2626; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: white;">Password Reset Request</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #4B5563; font-size: 16px;">
                We received a request to reset your password. Click the button below to create a new password.
              </p>
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 30px auto;">
                <tr>
                  <td style="border-radius: 6px; background: #DC2626;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 16px 32px; font-size: 16px; color: white; text-decoration: none;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <div style="margin: 30px 0; padding: 20px; background: #FEF2F2; border-left: 4px solid #DC2626;">
                <p style="margin: 0; color: #991B1B; font-weight: 600;">
                  ⚠️ Security Notice
                </p>
                <p style="margin: 10px 0 0; color: #7F1D1D;">
                  If you didn't request this, please ignore this email. This link expires in 1 hour.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Password Reset Request - Zephix',
      html,
      text: `Reset your password by visiting: ${resetUrl}. This link expires in 1 hour.`,
    });
  }

  async sendLoginAlertEmail(
    email: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const timestamp = new Date().toLocaleString();

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background: #f4f4f4;">
        <table align="center" width="600" style="margin: 20px auto; background: white; border-radius: 8px;">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: #F59E0B; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: white;">⚠️ New Login Detected</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p>A new login to your account was detected:</p>
              <div style="background: #F9FAFB; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <p><strong>Time:</strong> ${timestamp}</p>
                <p><strong>IP Address:</strong> ${ipAddress}</p>
                <p><strong>Browser:</strong> ${userAgent}</p>
              </div>
              <p style="color: #DC2626;">
                <strong>Not you?</strong> Reset your password immediately.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: '⚠️ New Login to Your Zephix Account',
      html,
      text: `New login detected from IP: ${ipAddress} at ${timestamp}`,
    });
  }

  async sendAccountLockedEmail(email: string, unlockTime: Date): Promise<void> {
    const html = `
      <h2>Account Temporarily Locked</h2>
      <p>Your account has been locked due to multiple failed login attempts.</p>
      <p>It will be unlocked at: ${unlockTime.toLocaleString()}</p>
      <p>If this wasn't you, please contact support.</p>
    `;

    await this.sendEmail({
      to: email,
      subject: '🔒 Account Locked - Zephix',
      html,
    });
  }
}
