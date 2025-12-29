import { Injectable } from '@nestjs/common';
import { EmailService } from '../../../src/shared/services/email.service';

/**
 * Mock Email Service for E2E Tests
 *
 * Stubs email sending to only write to auth_outbox.
 * Does not call external SendGrid.
 */
@Injectable()
export class MockEmailService extends EmailService {
  private sentEmails: Array<{
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }> = [];

  async sendEmail(options: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    from?: string;
  }): Promise<void> {
    // Just record the email, don't actually send
    this.sentEmails.push({
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    console.log(`[MOCK] Email would be sent to ${options.to}: ${options.subject}`);
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Verify your Zephix account',
      html: `<p>Verify: ${token}</p>`,
      text: `Verify: ${token}`,
    });
  }

  getSentEmails() {
    return this.sentEmails;
  }

  clearSentEmails() {
    this.sentEmails = [];
  }
}

