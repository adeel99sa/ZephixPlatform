#!/usr/bin/env node

/**
 * Test script for uptime monitors
 * Tests email configuration and endpoint connectivity
 */

require('dotenv').config();
const UptimeMonitor = require('./monitor');

async function testEmailConfiguration() {
  console.log('📧 Testing email configuration...');
  
  const config = {
    monitors: [{
      name: 'Test Service',
      url: 'https://httpbin.org/status/200',
      method: 'GET',
      expectedStatus: 200,
      timeout: 10000,
      interval: 60000,
      retries: 1
    }],
    email: {
      enabled: process.env.EMAIL_ENABLED === 'true',
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: process.env.ALERT_EMAIL
    },
    webhook: {
      enabled: false
    }
  };

  if (!config.email.enabled) {
    console.log('❌ Email not enabled. Set EMAIL_ENABLED=true in .env');
    return false;
  }

  if (!config.email.user || !config.email.pass || !config.email.to) {
    console.log('❌ Missing email configuration. Check SMTP_USER, SMTP_PASS, and ALERT_EMAIL in .env');
    return false;
  }

  try {
    const monitor = new UptimeMonitor(config);
    
    if (monitor.transporter) {
      await monitor.transporter.verify();
      console.log('✅ SMTP connection successful');
      
      // Send test email
      await monitor.sendEmailAlert(
        config.monitors[0],
        {
          isUp: false,
          statusCode: 500,
          error: 'Test alert - please ignore',
          responseTime: 1000,
          timestamp: new Date().toISOString()
        },
        'down'
      );
      
      console.log('✅ Test alert email sent successfully');
      return true;
    }
  } catch (error) {
    console.log('❌ Email test failed:', error.message);
    return false;
  }
  
  return false;
}

async function testEndpointConnectivity() {
  console.log('\n🌐 Testing endpoint connectivity...');
  
  const endpoints = [
    'https://api.getzephix.com/api/health',
    'https://getzephix.com',
    'https://httpbin.org/status/200' // Test endpoint
  ];
  
  const axios = require('axios');
  
  for (const url of endpoints) {
    try {
      const start = Date.now();
      const response = await axios.get(url, { timeout: 10000 });
      const responseTime = Date.now() - start;
      
      console.log(`✅ ${url}: HTTP ${response.status} (${responseTime}ms)`);
    } catch (error) {
      const responseTime = Date.now() - start;
      console.log(`❌ ${url}: ${error.message} (${responseTime}ms)`);
    }
  }
}

async function runTests() {
  console.log('🧪 Zephix Uptime Monitor - Test Suite\n');
  
  // Test email configuration
  const emailTest = await testEmailConfiguration();
  
  // Test endpoint connectivity  
  await testEndpointConnectivity();
  
  console.log('\n📊 Test Summary:');
  console.log(`📧 Email Configuration: ${emailTest ? '✅ Passed' : '❌ Failed'}`);
  console.log('🌐 Endpoint Tests: See results above');
  
  if (emailTest) {
    console.log('\n🚀 All tests passed! You can now run the monitor with: npm start');
  } else {
    console.log('\n⚠️  Please fix email configuration before running the monitor');
  }
}

// Run tests
runTests().catch(console.error);
