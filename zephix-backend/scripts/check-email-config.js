#!/usr/bin/env node

/**
 * Email Configuration Check Script
 * 
 * Usage: node scripts/check-email-config.js
 * 
 * This script displays current email configuration and diagnoses common issues
 */

require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

console.log('📧 Email Service Configuration Check\n');

// Check environment variables
console.log('🔧 Environment Variables:');
console.log('─'.repeat(50));

const emailConfig = {
  NODE_ENV: process.env.NODE_ENV || 'NOT SET',
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS || 'NOT SET',
  SMTP_HOST: process.env.SMTP_HOST || 'NOT SET',
  SMTP_PORT: process.env.SMTP_PORT || 'NOT SET',
  SMTP_SECURE: process.env.SMTP_SECURE || 'NOT SET',
  SMTP_USER: process.env.SMTP_USER || 'NOT SET',
  SMTP_PASS: process.env.SMTP_PASS ? '***SET***' : 'NOT SET',
};

Object.entries(emailConfig).forEach(([key, value]) => {
  const status = value === 'NOT SET' ? '❌' : '✅';
  console.log(`${status} ${key}: ${value}`);
});

console.log('\n🔍 Configuration Analysis:');
console.log('─'.repeat(50));

// Check NODE_ENV
if (process.env.NODE_ENV !== 'production') {
  console.log('⚠️  NODE_ENV is not set to "production"');
  console.log('   Emails will be logged to console instead of sent');
  console.log('   Set NODE_ENV=production to enable actual email sending');
} else {
  console.log('✅ NODE_ENV is set to production - emails will be sent');
}

// Check SMTP configuration
const missingConfigs = [];
if (!process.env.SMTP_HOST) missingConfigs.push('SMTP_HOST');
if (!process.env.SMTP_PORT) missingConfigs.push('SMTP_PORT');
if (!process.env.SMTP_USER) missingConfigs.push('SMTP_USER');
if (!process.env.SMTP_PASS) missingConfigs.push('SMTP_PASS');

if (missingConfigs.length > 0) {
  console.log('\n❌ Missing required SMTP configuration:');
  missingConfigs.forEach(config => {
    console.log(`   - ${config}`);
  });
  console.log('\n💡 Add these to your .env file or environment variables');
} else {
  console.log('\n✅ All required SMTP settings are configured');
}

// Check .env file
console.log('\n📄 .env File Status:');
console.log('─'.repeat(50));

const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasSmtpConfig = envContent.includes('SMTP_HOST') && 
                        envContent.includes('SMTP_USER') && 
                        envContent.includes('SMTP_PASS');
  
  console.log('✅ .env file exists');
  console.log(`${hasSmtpConfig ? '✅' : '❌'} SMTP configuration found in .env`);
  
  // Check if placeholder values
  if (envContent.includes('your-personal-gmail@gmail.com')) {
    console.log('⚠️  .env contains placeholder values - update with actual credentials');
  }
} else {
  console.log('❌ .env file not found');
  console.log('   Create one using: cp env.production.template .env');
}

// Test SMTP connection
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  console.log('\n🌐 Testing SMTP Connection:');
  console.log('─'.repeat(50));
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  transporter.verify((error, success) => {
    if (error) {
      console.log('❌ SMTP connection failed:', error.message);
      
      // Common error explanations
      if (error.message.includes('Invalid login')) {
        console.log('\n💡 Invalid credentials. Check:');
        console.log('   - Gmail: Use app password, not regular password');
        console.log('   - Gmail: Enable 2FA first');
        console.log('   - Remove spaces from app password');
      } else if (error.message.includes('ENOTFOUND')) {
        console.log('\n💡 Cannot resolve SMTP host. Check:');
        console.log('   - Internet connection');
        console.log('   - SMTP_HOST spelling (should be smtp.gmail.com)');
      } else if (error.message.includes('ETIMEDOUT')) {
        console.log('\n💡 Connection timeout. Check:');
        console.log('   - Firewall settings');
        console.log('   - Port 587 is not blocked');
        console.log('   - Try port 465 with SMTP_SECURE=true');
      }
    } else {
      console.log('✅ SMTP connection successful!');
      console.log('   Email service is ready to send emails');
    }
    
    // Summary
    console.log('\n📊 Summary:');
    console.log('─'.repeat(50));
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('🟡 Email service is in DEVELOPMENT mode');
      console.log('   - Emails will be logged, not sent');
      console.log('   - Set NODE_ENV=production to send real emails');
    } else if (error) {
      console.log('🔴 Email service is NOT working');
      console.log('   - Fix the SMTP connection issues above');
      console.log('   - Run this script again to verify');
    } else {
      console.log('🟢 Email service is READY');
      console.log('   - Users will receive verification emails');
      console.log('   - Run "npm run test:email" to send a test');
    }
    
    console.log('\n💡 Next Steps:');
    if (!process.env.SMTP_PASS || process.env.SMTP_PASS === 'your-app-password') {
      console.log('1. Generate Gmail app password: https://myaccount.google.com/apppasswords');
      console.log('2. Update SMTP_USER and SMTP_PASS in .env');
    }
    console.log('3. Test with: npm run test:email your-email@example.com');
    console.log('4. Verify user email: node scripts/verify-user-email.js adeel99sa@yahoo.com');
  });
} else {
  console.log('\n⚠️  Cannot test SMTP connection - missing configuration');
  console.log('   Configure SMTP settings first');
}