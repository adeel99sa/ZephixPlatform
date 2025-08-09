#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const nodemailer = require('nodemailer');

/**
 * Zephix Uptime Monitor
 * Monitors API and landing site health with email alerts
 */

const config = {
  monitors: [
    {
      name: 'Zephix API Health',
      url: 'https://api.getzephix.com/api/health',
      method: 'GET',
      expectedStatus: 200,
      timeout: 30000,
      interval: 5 * 60 * 1000, // 5 minutes
      retries: 2
    },
    {
      name: 'Zephix Landing Site',
      url: 'https://getzephix.com',
      method: 'GET',
      expectedStatus: 200,
      timeout: 30000,
      interval: 5 * 60 * 1000, // 5 minutes
      retries: 2
    }
  ],
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
    enabled: process.env.WEBHOOK_ENABLED === 'true',
    url: process.env.WEBHOOK_URL
  }
};

class UptimeMonitor {
  constructor(config) {
    this.config = config;
    this.status = new Map();
    this.lastChecks = new Map();
    this.consecutiveFailures = new Map();
    
    if (config.email.enabled) {
      this.setupEmailer();
    }
    
    console.log('🚀 Zephix Uptime Monitor Started');
    console.log(`📧 Email alerts: ${config.email.enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`🔗 Webhook alerts: ${config.webhook.enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`📊 Monitoring ${config.monitors.length} services`);
  }

  setupEmailer() {
    this.transporter = nodemailer.createTransporter({
      host: this.config.email.host,
      port: this.config.email.port,
      secure: this.config.email.secure,
      auth: {
        user: this.config.email.user,
        pass: this.config.email.pass
      }
    });
  }

  async checkEndpoint(monitor) {
    const start = Date.now();
    
    try {
      const response = await axios({
        method: monitor.method,
        url: monitor.url,
        timeout: monitor.timeout,
        validateStatus: (status) => status === monitor.expectedStatus,
        headers: {
          'User-Agent': 'Zephix-Uptime-Monitor/1.0'
        }
      });
      
      const responseTime = Date.now() - start;
      
      return {
        isUp: true,
        statusCode: response.status,
        responseTime,
        timestamp: new Date().toISOString(),
        headers: response.headers
      };
      
    } catch (error) {
      const responseTime = Date.now() - start;
      
      return {
        isUp: false,
        statusCode: error.response?.status || 0,
        error: error.message,
        responseTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkWithRetries(monitor) {
    let lastResult;
    
    for (let attempt = 1; attempt <= monitor.retries + 1; attempt++) {
      lastResult = await this.checkEndpoint(monitor);
      
      if (lastResult.isUp) {
        return lastResult;
      }
      
      if (attempt <= monitor.retries) {
        console.log(`❌ ${monitor.name} failed (attempt ${attempt}/${monitor.retries + 1}), retrying in 10s...`);
        await this.sleep(10000);
      }
    }
    
    return lastResult;
  }

  async sendEmailAlert(monitor, result, type = 'down') {
    if (!this.config.email.enabled || !this.transporter) {
      return;
    }

    const isDown = type === 'down';
    const subject = isDown 
      ? `🚨 ${monitor.name} is DOWN` 
      : `✅ ${monitor.name} is back UP`;
    
    const consecutiveFailures = this.consecutiveFailures.get(monitor.name) || 0;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${isDown ? '#fee2e2' : '#d1fae5'}; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="margin: 0; color: ${isDown ? '#991b1b' : '#065f46'};">
            ${isDown ? '🚨' : '✅'} Service ${isDown ? 'Alert' : 'Recovery'}
          </h2>
        </div>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Service:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${monitor.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">URL:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
              <a href="${monitor.url}" style="color: #3b82f6;">${monitor.url}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Status:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
              <span style="color: ${result.isUp ? '#065f46' : '#991b1b'}; font-weight: bold;">
                ${result.isUp ? 'UP' : 'DOWN'}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">HTTP Status:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${result.statusCode || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Response Time:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${result.responseTime}ms</td>
          </tr>
          ${result.error ? `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Error:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #991b1b;">${result.error}</td>
          </tr>
          ` : ''}
          ${isDown && consecutiveFailures > 0 ? `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Consecutive Failures:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #991b1b;">${consecutiveFailures}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Timestamp:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${result.timestamp}</td>
          </tr>
        </table>
        
        <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            This alert was generated by Zephix Uptime Monitor. 
            ${isDown ? 'Please investigate the issue immediately.' : 'Service has been restored.'}
          </p>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: this.config.email.from,
        to: this.config.email.to,
        subject,
        html
      });
      console.log(`📧 Alert sent for ${monitor.name} (${type})`);
    } catch (error) {
      console.error('❌ Failed to send email alert:', error.message);
    }
  }

  async sendWebhookAlert(monitor, result, type = 'down') {
    if (!this.config.webhook.enabled) {
      return;
    }

    const payload = {
      service: monitor.name,
      url: monitor.url,
      status: result.isUp ? 'up' : 'down',
      statusCode: result.statusCode,
      responseTime: result.responseTime,
      error: result.error,
      timestamp: result.timestamp,
      type,
      consecutiveFailures: this.consecutiveFailures.get(monitor.name) || 0
    };

    try {
      await axios.post(this.config.webhook.url, payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Zephix-Uptime-Monitor/1.0'
        }
      });
      console.log(`🔗 Webhook sent for ${monitor.name} (${type})`);
    } catch (error) {
      console.error('❌ Failed to send webhook:', error.message);
    }
  }

  async monitor(monitorConfig) {
    const result = await this.checkWithRetries(monitorConfig);
    const previousStatus = this.status.get(monitorConfig.name);
    const currentFailures = this.consecutiveFailures.get(monitorConfig.name) || 0;
    
    // Update status tracking
    this.status.set(monitorConfig.name, result.isUp);
    this.lastChecks.set(monitorConfig.name, result);
    
    // Handle consecutive failures
    if (!result.isUp) {
      this.consecutiveFailures.set(monitorConfig.name, currentFailures + 1);
    } else {
      this.consecutiveFailures.set(monitorConfig.name, 0);
    }
    
    // Log result
    const statusIcon = result.isUp ? '✅' : '❌';
    const failureText = currentFailures > 0 ? ` (${currentFailures + 1} failures)` : '';
    console.log(`${statusIcon} ${monitorConfig.name}: ${result.isUp ? 'UP' : 'DOWN'} (${result.responseTime}ms)${failureText}`);
    
    // Send alert if status changed to DOWN
    if (!result.isUp && previousStatus !== false) {
      await Promise.all([
        this.sendEmailAlert(monitorConfig, result, 'down'),
        this.sendWebhookAlert(monitorConfig, result, 'down')
      ]);
    }
    
    // Send recovery alert if status changed to UP
    if (result.isUp && previousStatus === false) {
      await Promise.all([
        this.sendEmailAlert(monitorConfig, result, 'up'),
        this.sendWebhookAlert(monitorConfig, result, 'up')
      ]);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus() {
    const status = {};
    this.config.monitors.forEach(monitor => {
      const lastCheck = this.lastChecks.get(monitor.name);
      const consecutiveFailures = this.consecutiveFailures.get(monitor.name) || 0;
      
      status[monitor.name] = {
        isUp: this.status.get(monitor.name),
        lastCheck: lastCheck ? {
          timestamp: lastCheck.timestamp,
          responseTime: lastCheck.responseTime,
          statusCode: lastCheck.statusCode
        } : null,
        consecutiveFailures
      };
    });
    return status;
  }

  start() {
    console.log('🔄 Starting uptime monitoring...\n');
    
    this.config.monitors.forEach(monitor => {
      // Initial check
      this.monitor(monitor);
      
      // Set up interval
      setInterval(() => {
        this.monitor(monitor);
      }, monitor.interval);
      
      console.log(`📊 ${monitor.name}: checking every ${monitor.interval / 1000}s`);
    });
    
    // Status summary every hour
    setInterval(() => {
      console.log('\n📈 Status Summary:');
      const status = this.getStatus();
      Object.entries(status).forEach(([name, data]) => {
        const icon = data.isUp ? '✅' : '❌';
        const failures = data.consecutiveFailures > 0 ? ` (${data.consecutiveFailures} failures)` : '';
        console.log(`  ${icon} ${name}${failures}`);
      });
      console.log('');
    }, 60 * 60 * 1000); // 1 hour
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down uptime monitor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down uptime monitor...');
  process.exit(0);
});

// Start monitoring
if (require.main === module) {
  const monitor = new UptimeMonitor(config);
  monitor.start();
}

module.exports = UptimeMonitor;
