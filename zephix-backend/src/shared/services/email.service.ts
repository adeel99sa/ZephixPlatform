import sgMail from '@sendgrid/mail';
import { Injectable } from '@nestjs/common';

export interface InvitationEmailData {
  recipientEmail: string;
  inviterName: string;
  organizationName: string;
  invitationToken: string;  // This is what's passed
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
      console.log('SendGrid configured successfully');
    } else {
      console.warn('SendGrid API key not found - emails will not be sent');
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
      first100Chars: options.html?.substring(0, 100)
    });

    // Ensure we have content
    const htmlContent = options.html || `
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
      from: options.from || process.env.SENDGRID_FROM_EMAIL || 'noreply@zephix.dev',
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
      html
    });
  }

  async sendWaitlistWelcome(email: string, name: string, position: number): Promise<void> {
    const html = `
      <h2>Welcome to Zephix, ${name}!</h2>
      <p>Thank you for joining our waitlist. You are currently in position ${position}.</p>
      <p>We'll notify you as soon as your spot opens up!</p>
      <p>Best regards,<br>The Zephix Team</p>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Welcome to Zephix Waitlist!',
      html
    });
  }
}
