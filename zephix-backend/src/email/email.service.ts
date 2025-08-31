import { Injectable } from '@nestjs/common';
import sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey && apiKey !== 'your_key_here') {
      sgMail.setApiKey(apiKey);
      console.log('✅ SendGrid configured for email delivery');
    } else {
      console.warn('⚠️ SENDGRID_API_KEY not configured - emails will not be sent');
    }
  }

  async sendWaitlistWelcome(email: string, name: string, position: number) {
    if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === 'your_key_here') {
      console.log(`📧 Email would be sent to ${email} (SendGrid not configured)`);
      return;
    }

    const msg = {
      to: email,
      from: 'test@example.com', // Generic sender that works without verification
      subject: 'Welcome to Zephix - You\'re #' + position + '! 🚀',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome, ${name}!</h2>
          <p>You're #${position} on the Zephix waitlist.</p>
          <p>We'll reach out soon with your beta access.</p>
        </div>
      `,
    };

    try {
      await sgMail.send(msg);
      console.log(`✅ Welcome email sent to ${email}`);
    } catch (error) {
      console.error(`❌ SendGrid error:`, error);
    }
  }
}
