# Zephix Uptime Monitor

External uptime monitoring for Zephix services with email alerts.

## Features

- 🔍 **HTTP(S) Monitoring** - Monitor any web endpoint
- 📧 **Email Alerts** - Instant notifications when services go down/up
- 🔄 **Automatic Retries** - Reduces false positives with retry logic
- 📊 **Status Tracking** - Track consecutive failures and recovery
- 🔗 **Webhook Support** - Send alerts to Slack, Discord, etc.
- 🐳 **Docker Ready** - Easy deployment with Docker
- ⚡ **Lightweight** - Minimal resource usage

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp env.example .env
# Edit .env with your email settings
```

### 3. Test Configuration
```bash
npm test
```

### 4. Start Monitoring
```bash
npm start
```

## Configuration

### Email Providers

**Gmail (Recommended for testing):**
```env
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Generate at https://myaccount.google.com/apppasswords
EMAIL_FROM=Zephix Monitor <your-email@gmail.com>
ALERT_EMAIL=alerts@yourdomain.com
```

**SendGrid (Recommended for production):**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

**Mailgun:**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
```

### Monitored Services

Currently monitoring:
- **Zephix API:** `https://api.getzephix.com/api/health`
- **Zephix Landing:** `https://getzephix.com`

Check interval: 5 minutes
Timeout: 30 seconds
Retries: 2 attempts before alerting

## Deployment Options

### Option 1: Railway (Recommended)

1. **Create new Railway service:**
   ```bash
   railway login
   railway create
   railway up
   ```

2. **Set environment variables in Railway dashboard:**
   - `EMAIL_ENABLED=true`
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_USER=your-email@gmail.com`
   - `SMTP_PASS=your-app-password`
   - `ALERT_EMAIL=alerts@yourdomain.com`

### Option 2: Docker

```bash
# Build image
docker build -t zephix-uptime-monitor .

# Run container
docker run -d \
  --name zephix-monitor \
  --env-file .env \
  --restart unless-stopped \
  zephix-uptime-monitor
```

### Option 3: VPS/Server

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start monitor.js --name "zephix-uptime"

# Save PM2 configuration
pm2 save
pm2 startup
```

### Option 4: GitHub Actions (Free tier)

Create `.github/workflows/uptime-monitor.yml`:
```yaml
name: Uptime Monitor
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: node monitor.js
        env:
          EMAIL_ENABLED: ${{ secrets.EMAIL_ENABLED }}
          SMTP_HOST: ${{ secrets.SMTP_HOST }}
          SMTP_USER: ${{ secrets.SMTP_USER }}
          SMTP_PASS: ${{ secrets.SMTP_PASS }}
          ALERT_EMAIL: ${{ secrets.ALERT_EMAIL }}
```

## Email Alert Examples

### Down Alert
```
🚨 Zephix API Health is DOWN

Service: Zephix API Health
URL: https://api.getzephix.com/api/health
Status: DOWN
HTTP Status: 500
Response Time: 30000ms
Error: Request timeout
Consecutive Failures: 3
Timestamp: 2025-01-03T10:30:00.000Z
```

### Recovery Alert
```
✅ Zephix API Health is back UP

Service: Zephix API Health is now operational
Response Time: 245ms
Timestamp: 2025-01-03T10:35:00.000Z
```

## Monitoring Logic

1. **Initial Check:** Service starts with immediate health check
2. **Interval Monitoring:** Checks every 5 minutes
3. **Retry Logic:** 2 retries with 10-second delays on failure
4. **Alert Triggers:**
   - **Down Alert:** Sent when service goes from UP → DOWN
   - **Recovery Alert:** Sent when service goes from DOWN → UP
5. **Status Tracking:** Consecutive failures tracked for severity assessment

## Webhook Integration

Enable webhook alerts for Slack, Discord, or custom endpoints:

```env
WEBHOOK_ENABLED=true
WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

Webhook payload:
```json
{
  "service": "Zephix API Health",
  "url": "https://api.getzephix.com/api/health",
  "status": "down",
  "statusCode": 500,
  "responseTime": 30000,
  "error": "Request timeout",
  "timestamp": "2025-01-03T10:30:00.000Z",
  "type": "down",
  "consecutiveFailures": 3
}
```

## Troubleshooting

### Common Issues

**Email not sending:**
- Check SMTP credentials
- For Gmail, use App Passwords (not your regular password)
- Verify EMAIL_ENABLED=true

**False positives:**
- Increase retry count in monitor.js
- Check network connectivity from monitoring location
- Verify target endpoints are accessible

**High resource usage:**
- Increase check intervals
- Reduce number of monitored endpoints
- Deploy on dedicated server

### Testing

```bash
# Test email configuration
npm test

# Test specific endpoint
curl -I https://api.getzephix.com/api/health

# Check monitor logs
pm2 logs zephix-uptime  # If using PM2
docker logs zephix-monitor  # If using Docker
```

## Monitoring Best Practices

1. **Multiple Locations:** Deploy monitors from different geographic locations
2. **Escalation:** Set up multiple alert channels (email + SMS + Slack)
3. **Maintenance Windows:** Disable alerts during planned maintenance
4. **Response Time Thresholds:** Alert on slow responses, not just failures
5. **Health Check Endpoints:** Monitor dedicated health endpoints, not just homepage

## Integration with Status Page

The monitor can integrate with your status page by:

1. **Webhook to Status Page API:** Update service status automatically
2. **Database Integration:** Write status to shared database
3. **File-based Updates:** Generate status files for static status pages

Example webhook integration:
```javascript
// In monitor.js, add to sendWebhookAlert function
const statusPagePayload = {
  component_id: 'api_service',
  status: result.isUp ? 'operational' : 'major_outage'
};

await axios.post('https://api.statuspage.io/v1/pages/YOUR_PAGE_ID/components/api_service', 
  statusPagePayload, 
  { headers: { 'Authorization': 'OAuth YOUR_TOKEN' } }
);
```

## License

MIT License - See LICENSE file for details.
