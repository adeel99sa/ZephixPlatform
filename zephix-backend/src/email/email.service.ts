// File: zephix-backend/src/email/email.service.ts
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;

  constructor() {
    // Configure with your email service (SendGrid, AWS SES, etc)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendWaitlistWelcome(email: string, name: string, position: number) {
    const mailOptions = {
      from: '"Zephix Team" <noreply@zephix.io>',
      to: email,
      subject: 'Welcome to the Zephix Founding Team! 🚀',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to the Future of Project Intelligence, ${name}!</h2>
          
          <p>Thank you for joining the Zephix waitlist. You're now #${position} in line for early access.</p>
          
          <p>As a founding member, you'll get:</p>
          <ul>
            <li>First access to the Q1 2026 beta</li>
            <li>Direct input on features we build</li>
            <li>50% lifetime discount when we launch</li>
            <li>Priority support forever</li>
          </ul>
          
          <p><strong>What happens next?</strong></p>
          <p>We'll reach out in early 2026 with your beta access. In the meantime, 
          we'd love to hear more about your project management challenges.</p>
          
          <p>Simply reply to this email and tell us about the biggest problem you face 
          managing projects. Every response is read by the founding team.</p>
          
          <p>Best regards,<br>
          The Zephix Team</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            You're receiving this because you signed up for the Zephix waitlist.
            We'll only email you with important updates about your early access.
          </p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to ${email}`);
    } catch (error) {
      console.error('Email send error:', error);
      // Don't throw - we still want signup to succeed even if email fails
    }
  }
}
