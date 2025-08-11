# Email Setup Guide for Zephix

## Current Issue
Users are not receiving verification emails after signup, causing them to be unable to access the application.

## Phase 1: Quick Fix (Immediate - 30 minutes)

### Step 1: Create Gmail App Password
1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to Security → 2-Step Verification (must be enabled)
3. Scroll down to "App passwords"
4. Click "Select app" → Choose "Mail"
5. Click "Select device" → Choose "Other" and name it "Zephix Backend"
6. Click "Generate"
7. Copy the 16-character password (save it securely)

### Step 2: Update Environment Configuration
1. Edit the `.env` file in `zephix-backend/`
2. Update these values:
```env
# Email Configuration
EMAIL_FROM_ADDRESS=noreply@getzephix.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-personal-gmail@gmail.com  # Your actual Gmail address
SMTP_PASS=xxxx xxxx xxxx xxxx            # The 16-character app password (no spaces)

# Ensure production mode for actual email sending
NODE_ENV=production
```

### Step 3: Test Email Service
Run this command to test the email configuration:
```bash
cd zephix-backend
npm run test:email  # You may need to create this script
```

Or manually test by:
1. Starting the backend service
2. Attempting to register a new user
3. Checking logs for email sending confirmation

### Step 4: Verify Email Delivery
1. Check the recipient's inbox (including spam folder)
2. Monitor application logs for any SMTP errors
3. Verify the email contains the correct verification link

## Phase 2: Google Workspace Setup (This Week)

### Step 1: Sign up for Google Workspace
1. Go to https://workspace.google.com/
2. Choose a plan (Business Starter is sufficient)
3. Use domain: getzephix.com
4. Create admin account: admin@getzephix.com

### Step 2: Configure DNS Records
Add these records to your domain's DNS:

#### MX Records (for receiving email)
```
Priority  Host  Value
1         @     ASPMX.L.GOOGLE.COM
5         @     ALT1.ASPMX.L.GOOGLE.COM
5         @     ALT2.ASPMX.L.GOOGLE.COM
10        @     ALT3.ASPMX.L.GOOGLE.COM
10        @     ALT4.ASPMX.L.GOOGLE.COM
```

#### SPF Record (TXT)
```
Host: @
Value: v=spf1 include:_spf.google.com ~all
```

#### DKIM Record (TXT)
1. Get from Google Workspace Admin → Apps → Gmail → Authenticate email
2. Add as TXT record with host: google._domainkey

#### DMARC Record (TXT)
```
Host: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:admin@getzephix.com
```

### Step 3: Update Application Configuration
```env
# Professional Email Configuration
EMAIL_FROM_ADDRESS=noreply@getzephix.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=admin@getzephix.com
SMTP_PASS=workspace-app-password  # Generate new app password for workspace account
```

## Phase 3: Enterprise Grade (Next Month)

### 1. SendGrid Integration
Replace SMTP with SendGrid API for better deliverability:

```typescript
// Install: npm install @sendgrid/mail
import * as sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: user.email,
  from: 'noreply@getzephix.com',
  subject: 'Verify your email',
  html: emailTemplate,
};

await sgMail.send(msg);
```

### 2. Google SSO Integration
Add "Sign up with Google" functionality:

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://api.getzephix.com/auth/google/callback
```

### 3. Email Monitoring & Analytics
- Track email open rates
- Monitor bounce rates
- Implement webhook handlers for email events
- Set up alerts for failed deliveries

## Troubleshooting

### Common Issues

1. **"Username and password not accepted"**
   - Ensure 2FA is enabled on Gmail
   - Use app password, not regular password
   - Check for spaces in the app password

2. **Emails going to spam**
   - The FROM address (noreply@getzephix.com) doesn't match sending domain (gmail.com)
   - This is expected with personal Gmail
   - Will be resolved with Google Workspace setup

3. **Connection timeout**
   - Check firewall rules
   - Verify SMTP ports are not blocked
   - Try port 465 with SMTP_SECURE=true

### Testing Commands

Check email configuration:
```bash
# In the backend directory
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
transporter.verify((error, success) => {
  if (error) {
    console.log('Error:', error);
  } else {
    console.log('Server is ready to send emails');
  }
});
"
```

## Security Notes

1. **Never commit .env files** - Ensure .env is in .gitignore
2. **Use environment variables** in production (Railway, Heroku, etc.)
3. **Rotate app passwords** regularly
4. **Monitor for unauthorized access** in Google Account activity

## Next Steps After Quick Fix

1. ✅ Verify emails are being sent
2. ✅ Test user registration flow
3. 📅 Schedule Google Workspace setup
4. 📅 Plan DNS configuration window
5. 📅 Prepare for SendGrid migration

---

**Need help?** Check application logs for detailed SMTP errors or contact the development team.