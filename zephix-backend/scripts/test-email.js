#!/usr/bin/env node

/**
 * Email Configuration Test Script
 * 
 * Usage: node scripts/test-email.js [recipient-email]
 * 
 * This script tests the SMTP configuration and sends a test email
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

const recipientEmail = process.argv[2] || 'test@example.com';

console.log('🔧 Testing Email Configuration...\n');

// Display current configuration (masked)
console.log('Configuration:');
console.log('- SMTP Host:', process.env.SMTP_HOST || 'NOT SET');
console.log('- SMTP Port:', process.env.SMTP_PORT || 'NOT SET');
console.log('- SMTP User:', process.env.SMTP_USER || 'NOT SET');
console.log('- SMTP Pass:', process.env.SMTP_PASS ? '***SET***' : 'NOT SET');
console.log('- From Address:', process.env.EMAIL_FROM_ADDRESS || 'NOT SET');
console.log('- Node Env:', process.env.NODE_ENV || 'NOT SET');
console.log('\n');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify connection
console.log('📡 Verifying SMTP connection...');
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Connection Failed:', error.message);
    process.exit(1);
  } else {
    console.log('✅ SMTP Server is ready to send emails\n');
    
    // Send test email
    console.log(`📧 Sending test email to: ${recipientEmail}`);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM_ADDRESS || 'noreply@zephix.com',
      to: recipientEmail,
      subject: 'Zephix Email Test - Configuration Verified',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1>🎉 Email Configuration Test Successful!</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e1e5e9;">
            <p>This is a test email from your Zephix backend application.</p>
            <p><strong>Configuration Details:</strong></p>
            <ul>
              <li>SMTP Host: ${process.env.SMTP_HOST}</li>
              <li>SMTP Port: ${process.env.SMTP_PORT}</li>
              <li>From Address: ${process.env.EMAIL_FROM_ADDRESS || 'noreply@zephix.com'}</li>
              <li>Timestamp: ${new Date().toISOString()}</li>
            </ul>
            <p>If you received this email, your email configuration is working correctly! 🚀</p>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6c757d;">
            <p>This is an automated test email from Zephix</p>
          </div>
        </div>
      `,
      text: `Email Configuration Test Successful!\n\nThis is a test email from your Zephix backend application.\n\nConfiguration Details:\n- SMTP Host: ${process.env.SMTP_HOST}\n- SMTP Port: ${process.env.SMTP_PORT}\n- From Address: ${process.env.EMAIL_FROM_ADDRESS || 'noreply@zephix.com'}\n- Timestamp: ${new Date().toISOString()}\n\nIf you received this email, your email configuration is working correctly!`,
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('❌ Failed to send email:', error.message);
        process.exit(1);
      } else {
        console.log('✅ Email sent successfully!');
        console.log('📬 Message ID:', info.messageId);
        console.log('\n🎯 Next Steps:');
        console.log('1. Check the inbox (and spam folder) of:', recipientEmail);
        console.log('2. Verify the email content and formatting');
        console.log('3. Test the actual signup flow in your application');
        process.exit(0);
      }
    });
  }
});