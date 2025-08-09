# Uptime Monitoring Setup Guide

## Services to Monitor

### 1. API Service
- **URL:** `https://api.getzephix.com/api/health`
- **Expected Response:** HTTP 200
- **Check Interval:** 1-5 minutes
- **Timeout:** 30 seconds

### 2. Landing Site
- **URL:** `https://getzephix.com`
- **Expected Response:** HTTP 200
- **Check Interval:** 5 minutes
- **Timeout:** 30 seconds

## Recommended Monitoring Services

### Option 1: UptimeRobot (Recommended - Free Tier)

**Why UptimeRobot:**
- ✅ Free plan: 50 monitors, 5-minute intervals
- ✅ Email alerts included
- ✅ Simple setup
- ✅ Public status page integration
- ✅ Multiple alert channels

**Setup Steps:**
1. Sign up at https://uptimerobot.com
2. Create monitors:
   - **Monitor 1:** `https://api.getzephix.com/api/health`
   - **Monitor 2:** `https://getzephix.com`
3. Configure email alerts
4. Optional: Create public status page

**Configuration:**
```
Monitor Type: HTTP(s)
URL: https://api.getzephix.com/api/health
Friendly Name: Zephix API
Monitoring Interval: 5 minutes
Alert Contacts: your-email@domain.com
```

### Option 2: Pingdom (Premium Option)

**Why Pingdom:**
- ✅ More detailed monitoring
- ✅ Global monitoring locations
- ✅ Real User Monitoring (RUM)
- ✅ Advanced alerting
- ❌ Paid service ($10+/month)

**Setup Steps:**
1. Sign up at https://pingdom.com
2. Add uptime checks for both URLs
3. Configure email notifications
4. Set up escalation policies

### Option 3: Better Uptime

**Why Better Uptime:**
- ✅ Modern interface
- ✅ Incident management
- ✅ Status page included
- ✅ Free tier available
- ✅ Great alerting system

**Setup Steps:**
1. Sign up at https://betteruptime.com
2. Create heartbeat monitors
3. Set up incident escalation
4. Configure email/SMS alerts

### Option 4: Healthchecks.io (Simple & Free)

**Why Healthchecks.io:**
- ✅ Completely free for basic usage
- ✅ Simple "ping" monitoring
- ✅ Open source
- ✅ Cron job monitoring

**Setup Steps:**
1. Sign up at https://healthchecks.io
2. Create checks for both endpoints
3. Configure email notifications

## Quick Setup with UptimeRobot

### Step 1: Create Account
```
1. Go to https://uptimerobot.com
2. Sign up with your email
3. Verify email address
```

### Step 2: Add API Monitor
```
1. Click "Add New Monitor"
2. Monitor Type: HTTP(s)
3. Friendly Name: "Zephix API"
4. URL: https://api.getzephix.com/api/health
5. Monitoring Interval: 5 minutes
6. Keyword Monitoring: (leave blank or add "ok")
7. Click "Create Monitor"
```

### Step 3: Add Landing Site Monitor
```
1. Click "Add New Monitor"
2. Monitor Type: HTTP(s)
3. Friendly Name: "Zephix Landing"
4. URL: https://getzephix.com
5. Monitoring Interval: 5 minutes
6. Click "Create Monitor"
```

### Step 4: Configure Alerts
```
1. Go to "Alert Contacts"
2. Add Email contact with your email
3. For each monitor:
   - Edit monitor
   - Add alert contact
   - Set alert threshold (1 down check = immediate alert)
```

## Alternative: Script-Based Monitoring

If you prefer a custom solution, here's a Node.js monitoring script:

```javascript
// uptime-monitor.js
const https = require('https');
const nodemailer = require('nodemailer');

const config = {
  monitors: [
    {
      name: 'Zephix API',
      url: 'https://api.getzephix.com/api/health',
      interval: 5 * 60 * 1000, // 5 minutes
    },
    {
      name: 'Zephix Landing',
      url: 'https://getzephix.com',
      interval: 5 * 60 * 1000, // 5 minutes
    }
  ],
  email: {
    service: 'gmail', // or your email provider
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    to: process.env.ALERT_EMAIL
  }
};

class UptimeMonitor {
  constructor(config) {
    this.config = config;
    this.status = new Map();
    this.setupEmailer();
  }

  setupEmailer() {
    this.transporter = nodemailer.createTransporter({
      service: this.config.email.service,
      auth: {
        user: this.config.email.user,
        pass: this.config.email.pass
      }
    });
  }

  async checkEndpoint(monitor) {
    return new Promise((resolve) => {
      const start = Date.now();
      
      const req = https.get(monitor.url, (res) => {
        const responseTime = Date.now() - start;
        const isUp = res.statusCode >= 200 && res.statusCode < 400;
        
        resolve({
          isUp,
          statusCode: res.statusCode,
          responseTime,
          timestamp: new Date().toISOString()
        });
      });

      req.on('error', (error) => {
        resolve({
          isUp: false,
          error: error.message,
          responseTime: Date.now() - start,
          timestamp: new Date().toISOString()
        });
      });

      req.setTimeout(30000, () => {
        req.destroy();
        resolve({
          isUp: false,
          error: 'Timeout',
          responseTime: 30000,
          timestamp: new Date().toISOString()
        });
      });
    });
  }

  async sendAlert(monitor, result) {
    const subject = `🚨 ${monitor.name} is DOWN`;
    const html = `
      <h2>Service Alert</h2>
      <p><strong>Service:</strong> ${monitor.name}</p>
      <p><strong>URL:</strong> ${monitor.url}</p>
      <p><strong>Status:</strong> ${result.isUp ? 'UP' : 'DOWN'}</p>
      <p><strong>Error:</strong> ${result.error || 'N/A'}</p>
      <p><strong>Response Time:</strong> ${result.responseTime}ms</p>
      <p><strong>Timestamp:</strong> ${result.timestamp}</p>
    `;

    try {
      await this.transporter.sendMail({
        from: this.config.email.user,
        to: this.config.email.to,
        subject,
        html
      });
      console.log(`Alert sent for ${monitor.name}`);
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  async monitor(monitorConfig) {
    const result = await this.checkEndpoint(monitorConfig);
    const previousStatus = this.status.get(monitorConfig.name);
    
    console.log(`${monitorConfig.name}: ${result.isUp ? 'UP' : 'DOWN'} (${result.responseTime}ms)`);
    
    // Send alert if status changed to DOWN
    if (!result.isUp && previousStatus !== false) {
      await this.sendAlert(monitorConfig, result);
    }
    
    // Send recovery alert if status changed to UP
    if (result.isUp && previousStatus === false) {
      const subject = `✅ ${monitorConfig.name} is back UP`;
      const html = `
        <h2>Service Recovery</h2>
        <p><strong>Service:</strong> ${monitorConfig.name} is now operational</p>
        <p><strong>Response Time:</strong> ${result.responseTime}ms</p>
        <p><strong>Timestamp:</strong> ${result.timestamp}</p>
      `;
      
      try {
        await this.transporter.sendMail({
          from: this.config.email.user,
          to: this.config.email.to,
          subject,
          html
        });
      } catch (error) {
        console.error('Failed to send recovery alert:', error);
      }
    }
    
    this.status.set(monitorConfig.name, result.isUp);
  }

  start() {
    console.log('Starting uptime monitoring...');
    
    this.config.monitors.forEach(monitor => {
      // Initial check
      this.monitor(monitor);
      
      // Set up interval
      setInterval(() => {
        this.monitor(monitor);
      }, monitor.interval);
    });
  }
}

// Usage
if (require.main === module) {
  const monitor = new UptimeMonitor(config);
  monitor.start();
}

module.exports = UptimeMonitor;
```

## Deployment Options for Custom Script

### Option 1: Railway Deployment
```dockerfile
# Dockerfile for monitoring service
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "uptime-monitor.js"]
```

### Option 2: Cron Job (VPS/Server)
```bash
# Add to crontab
*/5 * * * * /usr/bin/node /path/to/uptime-monitor.js
```

### Option 3: GitHub Actions (Free)
```yaml
# .github/workflows/uptime-check.yml
name: Uptime Check
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check API Health
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" https://api.getzephix.com/api/health)
          if [ $response -ne 200 ]; then
            echo "API is down (HTTP $response)"
            exit 1
          fi
      - name: Check Landing Site
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" https://getzephix.com)
          if [ $response -ne 200 ]; then
            echo "Landing site is down (HTTP $response)"
            exit 1
          fi
```

## Recommended Implementation Plan

### Phase 1: Quick Setup (15 minutes)
1. **Sign up for UptimeRobot** (free)
2. **Add both monitors** (API + Landing)
3. **Configure email alerts**
4. **Test alerts** (temporarily break a service)

### Phase 2: Enhanced Monitoring (Optional)
1. **Add more check locations**
2. **Set up SMS alerts**
3. **Create public status page**
4. **Integrate with existing status page**

### Phase 3: Integration (Later)
1. **Connect to your status page**
2. **Add Slack/Discord notifications**
3. **Set up escalation policies**
4. **Add more endpoints** (auth, specific API routes)

## Next Steps

1. **Choose a monitoring service** (UptimeRobot recommended for quick start)
2. **Set up the monitors** following the guide above
3. **Test the alerts** by temporarily disabling a service
4. **Document the setup** for your team
5. **Consider integration** with your status page

Would you like me to help you set up any specific monitoring service or create the custom monitoring script?
