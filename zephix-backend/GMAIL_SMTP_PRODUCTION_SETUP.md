# Gmail SMTP Production Setup Guide

## 🚀 Complete Setup for noreply@getzephix.com

### Prerequisites
- Gmail account (personal or Google Workspace)
- 2-Factor Authentication enabled
- Access to Railway dashboard (or your hosting platform)

---

## Step 1: Create Gmail App Password (5 minutes)

### 1.1 Enable 2-Factor Authentication
1. Go to https://myaccount.google.com/security
2. Click on "2-Step Verification"
3. Follow the setup wizard if not already enabled

### 1.2 Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Sign in if prompted
3. In "Select app" dropdown, choose **Mail**
4. In "Select device" dropdown, choose **Other (Custom name)**
5. Enter name: **Zephix Production**
6. Click **Generate**
7. **COPY THE 16-CHARACTER PASSWORD** (shown without spaces)
   
   Example: `abcd efgh ijkl mnop` (you'll use it as `abcdefghijklmnop`)

⚠️ **IMPORTANT**: This password is shown only once. Save it securely!

---

## Step 2: Environment Variables Configuration

### 2.1 Local Development (.env file)

Create or update `/workspace/zephix-backend/.env`:

```env
# Database Configuration (REQUIRED for user verification)
DATABASE_URL=postgresql://username:password@host:5432/database_name

# Email Configuration
NODE_ENV=production
EMAIL_FROM_ADDRESS=noreply@getzephix.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your.email@gmail.com           # Your Gmail address
SMTP_PASS=abcdefghijklmnop              # 16-char app password (no spaces!)

# Application URLs
FRONTEND_URL=https://getzephix.com
API_URL=https://your-api-domain.com

# Security
JWT_SECRET=your-secure-jwt-secret-key
```

### 2.2 Production Variables (Required)

These are the essential variables for email functionality:

```env
# Core Email Settings
NODE_ENV=production                      # MUST be "production" to send emails
EMAIL_FROM_ADDRESS=noreply@getzephix.com # Display name in emails
SMTP_HOST=smtp.gmail.com                 # Gmail SMTP server
SMTP_PORT=587                           # Standard TLS port
SMTP_SECURE=false                       # Use STARTTLS
SMTP_USER=your.email@gmail.com          # Your actual Gmail
SMTP_PASS=abcdefghijklmnop              # App password (no spaces)

# URLs for email links
FRONTEND_URL=https://getzephix.com      # For verification links
```

---

## Step 3: Testing Email Delivery

### 3.1 Test Configuration Script

Run this to verify your setup:

```bash
cd /workspace/zephix-backend
npm run check:email-config
```

Expected output:
```
✅ NODE_ENV: production
✅ EMAIL_FROM_ADDRESS: noreply@getzephix.com
✅ SMTP_HOST: smtp.gmail.com
✅ SMTP_PORT: 587
✅ SMTP_USER: your.email@gmail.com
✅ SMTP_PASS: ***SET***
✅ SMTP connection successful!
```

### 3.2 Send Test Email

```bash
npm run test:email your-email@example.com
```

This will:
- Verify SMTP connection
- Send a test email
- Show success/error messages

### 3.3 Test User Registration

1. Start the backend:
   ```bash
   npm run start:dev
   ```

2. Register a new user via API or frontend

3. Check email logs:
   ```bash
   # Look for "Email sent to..." in console output
   ```

---

## Step 4: Railway Deployment Instructions

### 4.1 Add Environment Variables to Railway

1. Go to your Railway project dashboard
2. Click on your backend service
3. Navigate to **Variables** tab
4. Click **+ New Variable** and add each one:

| Variable Name | Value | Notes |
|--------------|-------|-------|
| NODE_ENV | production | Required for email sending |
| EMAIL_FROM_ADDRESS | noreply@getzephix.com | Your sender address |
| SMTP_HOST | smtp.gmail.com | Gmail server |
| SMTP_PORT | 587 | TLS port |
| SMTP_SECURE | false | Use STARTTLS |
| SMTP_USER | your.email@gmail.com | Your Gmail |
| SMTP_PASS | abcdefghijklmnop | App password (NO SPACES) |
| FRONTEND_URL | https://getzephix.com | For email links |

### 4.2 Deploy Changes

Option A - Automatic Deploy:
```bash
git add .
git commit -m "Configure production email settings"
git push origin main
```

Option B - Manual Deploy:
1. Click **Deploy** in Railway dashboard
2. Wait for deployment to complete
3. Check logs for any errors

### 4.3 Verify Production Email

1. Check Railway logs:
   ```
   Railway Dashboard → Your Service → Logs
   ```

2. Look for:
   - "Email service initialized"
   - "SMTP connection successful"
   - "Email sent to..."

---

## Step 5: Troubleshooting Guide

### Common Issues and Solutions

#### ❌ "Invalid login: Username and password not accepted"
- **Cause**: Wrong password type
- **Fix**: Use app password, not your Gmail password
- **Check**: Remove any spaces from the app password

#### ❌ "Connection timeout"
- **Cause**: Port blocked or wrong settings
- **Fix**: 
  - Try port 465 with SMTP_SECURE=true
  - Check firewall rules
  - Verify Railway allows outbound SMTP

#### ❌ Emails going to spam
- **Cause**: FROM address doesn't match sending domain
- **Fix**: 
  - This is expected with personal Gmail
  - Add SPF record: `v=spf1 include:_spf.google.com ~all`
  - Consider Google Workspace for getzephix.com

#### ❌ "NODE_ENV is not set to production"
- **Cause**: Missing or wrong environment variable
- **Fix**: Ensure NODE_ENV=production in Railway variables

---

## Step 6: Production Checklist

### Before Going Live:

- [ ] Gmail app password generated and saved
- [ ] All environment variables set in Railway
- [ ] Test email sent successfully
- [ ] User registration flow tested
- [ ] Email verification links working
- [ ] Emails not going to spam (check)
- [ ] Production logs showing email activity

### Security Best Practices:

1. **Never commit .env files** to git
2. **Use Railway's environment variables** for production
3. **Rotate app passwords** every 3-6 months
4. **Monitor failed login attempts** in Gmail
5. **Set up email alerts** for suspicious activity

---

## Step 7: Quick Reference Commands

```bash
# Check email configuration
npm run check:email-config

# Send test email
npm run test:email recipient@example.com

# Verify specific user (requires DATABASE_URL)
npm run verify:email user@example.com

# Check user status (requires DATABASE_URL)
npm run check:user user@example.com

# View Railway logs
railway logs
```

---

## Next Steps After Setup

### This Week:
1. ✅ Verify all users can receive emails
2. 📊 Monitor email delivery rates
3. 🔍 Check spam folder placement

### Next Month:
1. 🏢 Set up Google Workspace for getzephix.com
2. 📧 Migrate to professional email domain
3. 🚀 Consider SendGrid for better deliverability

---

## Emergency Contacts

- **Gmail Support**: https://support.google.com/mail
- **Railway Support**: https://railway.app/help
- **Google Workspace**: https://workspace.google.com/support

---

**Need help?** The email diagnostic script (`npm run check:email-config`) will identify most issues automatically.