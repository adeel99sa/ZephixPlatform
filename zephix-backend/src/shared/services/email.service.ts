import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface InvitationEmailData {
  recipientEmail: string;
  recipientName?: string;
  organizationName: string;
  inviterName: string;
  invitationToken: string;
  role: string;
  message?: string;
  expiresAt: Date;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailConfig = this.configService.get('email');

    if (emailConfig?.smtp?.host) {
      // Production SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: emailConfig.smtp.host as string,
        port: (emailConfig.smtp.port as number) || 587,
        secure: (emailConfig.smtp.secure as boolean) || false,
        auth: {
          user: emailConfig.smtp.user as string,
          pass: emailConfig.smtp.password as string,
        },
      });
    } else {
      // Development mode - log emails instead of sending
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
    }
  }

  async sendEmail(mailOptions: {
    from?: string;
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    const options = {
      from:
        this.configService.get<string>('email.fromAddress') ||
        'noreply@zephix.com',
      ...mailOptions,
    };

    try {
      const info = await this.transporter.sendMail(options);

      // ✅ SAFE TYPE CHECKING - NO MORE 'any' CASTING
      const isStreamTransport =
        this.transporter.options &&
        'streamTransport' in this.transporter.options &&
        (this.transporter.options as any).streamTransport === true;

      if (isStreamTransport) {
        // Development mode - log the email
        this.logger.log('=== EMAIL SENT (DEVELOPMENT MODE) ===');
        this.logger.log(`To: ${options.to}`);
        this.logger.log(`Subject: ${options.subject}`);
        this.logger.log('====================================');
      } else {
        this.logger.log(
          `Email sent to ${options.to}, messageId: ${info.messageId}`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(
        `Failed to send email to ${options.to}: ${errorMessage}`,
        error,
      );
      throw new Error('Failed to send email');
    }
  }

  async sendInvitationEmail(data: InvitationEmailData): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('app.frontendUrl') ||
      'http://localhost:5173';
    const invitationUrl = `${frontendUrl}/invite/${data.invitationToken}`;

    const subject = `You're invited to join ${data.organizationName} on Zephix`;

    const html = this.generateInvitationEmailTemplate({
      ...data,
      invitationUrl,
    });

    const mailOptions = {
      from:
        this.configService.get<string>('email.fromAddress') ||
        'noreply@zephix.com',
      to: data.recipientEmail,
      subject,
      html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);

      // ✅ SAFE TYPE CHECKING - NO MORE 'any' CASTING
      const isStreamTransport =
        this.transporter.options &&
        'streamTransport' in this.transporter.options &&
        this.transporter.options.streamTransport === true;

      if (isStreamTransport) {
        // Development mode - log the email
        this.logger.log('=== INVITATION EMAIL (DEVELOPMENT MODE) ===');
        this.logger.log(`To: ${data.recipientEmail}`);
        this.logger.log(`Subject: ${subject}`);
        this.logger.log(`Invitation URL: ${invitationUrl}`);
        this.logger.log(`Expires: ${data.expiresAt.toISOString()}`);
        this.logger.log('==========================================');
      } else {
        this.logger.log(
          `Invitation email sent to ${data.recipientEmail}, messageId: ${info.messageId}`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(
        `Failed to send invitation email to ${data.recipientEmail}: ${errorMessage}`,
        error,
      );
      throw new Error('Failed to send invitation email');
    }
  }

  private generateInvitationEmailTemplate(
    data: InvitationEmailData & { invitationUrl: string },
  ): string {
    const expiresInHours = Math.ceil(
      (data.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60),
    );

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Team Invitation - Zephix</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e1e5e9; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6c757d; }
          .btn { display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .btn:hover { background: #5a6fd8; }
          .role-badge { background: #e3f2fd; color: #1976d2; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: bold; }
          .message-box { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #667eea; }
          .expires { color: #dc3545; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 You're Invited!</h1>
            <p>Join ${data.organizationName} on Zephix</p>
          </div>
          
          <div class="content">
            <p>Hi${data.recipientName ? ` ${data.recipientName}` : ''},</p>
            
            <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.organizationName}</strong> as a <span class="role-badge">${data.role.toUpperCase()}</span> on Zephix.</p>
            
            ${
              data.message
                ? `
              <div class="message-box">
                <strong>Personal message:</strong><br>
                "${data.message}"
              </div>
            `
                : ''
            }
            
            <p>Zephix is a modern project management platform that helps teams collaborate effectively and deliver projects on time.</p>
            
            <div style="text-align: center;">
              <a href="${data.invitationUrl}" class="btn">Accept Invitation</a>
            </div>
            
            <p class="expires">⏰ This invitation expires in ${expiresInHours} hours (${data.expiresAt.toLocaleString()}).</p>
            
            <hr>
            
            <p><small>Can't click the button? Copy and paste this link into your browser:</small></p>
            <p><small><a href="${data.invitationUrl}">${data.invitationUrl}</a></small></p>
          </div>
          
          <div class="footer">
            <p>This invitation was sent by ${data.inviterName} from ${data.organizationName}.</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            <p>&copy; 2024 Zephix. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
