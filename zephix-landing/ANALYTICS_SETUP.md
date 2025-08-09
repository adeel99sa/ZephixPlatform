# Analytics Setup Guide

This landing page supports both **Plausible Analytics** (privacy-focused) and **Google Analytics 4** (feature-rich) with GDPR-compliant cookie consent.

## 🎯 Quick Setup

### Option 1: Plausible Analytics (Recommended)
**Privacy-focused, no cookies, GDPR compliant by default**

1. **Enable Plausible** in `index.html`:
```javascript
plausible: {
    enabled: true,
    domain: 'getzephix.com', // Replace with your domain
    src: 'https://plausible.io/js/script.js' // Or your self-hosted instance
}
```

2. **Create Plausible account**: https://plausible.io
3. **Add your domain** to Plausible dashboard
4. **Deploy** - Analytics will work automatically in production

### Option 2: Google Analytics 4
**Full-featured analytics with cookie consent**

1. **Enable GA4** in `index.html`:
```javascript
googleAnalytics: {
    enabled: true, // Set to true
    measurementId: 'G-XXXXXXXXXX', // Replace with your actual measurement ID
    requireConsent: true // Keep true for GDPR compliance
}
```

2. **Get Measurement ID**:
   - Go to Google Analytics → Admin → Data Streams
   - Select your web stream
   - Copy the Measurement ID (starts with G-)

3. **Deploy** - Cookie banner will appear for EU users

## 🚀 Production vs Development

Analytics only load in production environments:
- ✅ `getzephix.com`
- ✅ Custom domains
- ❌ `localhost`
- ❌ `127.0.0.1`
- ❌ `netlify.app` previews (configurable)
- ❌ `file://` protocol

To test analytics locally, temporarily change `isProduction` logic.

## 🍪 Cookie Banner (GA4 Only)

When Google Analytics is enabled with `requireConsent: true`:

**Automatic Behavior:**
- Shows cookie banner to new visitors
- Remembers user choice in localStorage
- Only loads GA4 after consent
- Slides in from bottom with animation

**User Options:**
- **Accept**: Loads GA4, stores consent
- **Decline**: No analytics, stores refusal
- **Privacy Policy**: Links to your privacy page

**GDPR Compliant:**
- Explicit consent required
- Easy to decline
- Clear explanation of usage
- Anonymized IP addresses

## 📊 Event Tracking

The `trackEvent()` helper function works with both analytics providers:

```javascript
// Track custom events
trackEvent('button_click', { 
    button_name: 'pricing_cta',
    section: 'hero' 
});

// Automatic events already tracked:
trackEvent('waitlist_signup', {
    method: 'form_submission',
    email_domain: 'gmail.com'
});

trackEvent('cookie_consent', { 
    consent: 'accepted' 
});
```

**Plausible Events:**
- Appears in Plausible dashboard under "Goal Conversions"
- Custom properties supported

**Google Analytics Events:**
- Appears in GA4 under Events
- Custom parameters supported
- Conversion tracking ready

## 🔧 Advanced Configuration

### Self-hosted Plausible
```javascript
plausible: {
    enabled: true,
    domain: 'getzephix.com',
    src: 'https://your-plausible-instance.com/js/script.js'
}
```

### GA4 without Cookie Banner
```javascript
googleAnalytics: {
    enabled: true,
    measurementId: 'G-XXXXXXXXXX',
    requireConsent: false // No cookie banner, loads immediately
}
```

### Both Analytics Together
```javascript
plausible: { enabled: true, domain: 'getzephix.com' },
googleAnalytics: { enabled: true, measurementId: 'G-XXXXXXXXXX' }
```

## 🔒 Security & Privacy

**Content Security Policy (CSP):**
- Updated to allow analytics domains
- Prevents XSS attacks
- Maintains security while enabling tracking

**Privacy Features:**
- IP anonymization enabled (GA4)
- SameSite=None;Secure cookies (GA4)
- No personal data collected
- User consent respected

**Domains Allowed in CSP:**
- `plausible.io` (or your custom domain)
- `www.googletagmanager.com`
- `www.google-analytics.com`
- `analytics.google.com`

## 📱 Mobile Optimization

**Cookie Banner:**
- Responsive design
- Touch-friendly buttons
- Stacks vertically on mobile
- Doesn't obstruct content

**Analytics:**
- Works on all devices
- Fast loading times
- No impact on page speed

## 🧪 Testing

### Test Plausible
1. Enable Plausible analytics
2. Deploy to production domain
3. Visit site in incognito mode
4. Check Plausible dashboard for visits

### Test Google Analytics
1. Enable GA4 analytics
2. Deploy to production domain
3. Accept cookie consent
4. Check GA4 Real-time reports

### Test Events
```javascript
// Open browser console and run:
trackEvent('test_event', { test: true });
```

## 🚨 Common Issues

**Analytics not loading?**
- Check `isProduction` logic
- Verify measurement IDs
- Check browser console for errors
- Ensure CSP allows analytics domains

**Cookie banner not showing?**
- GA4 must be enabled
- Must be production environment
- Check `requireConsent: true`
- Clear localStorage to reset

**Events not tracking?**
- Wait a few minutes for data
- Check browser network tab
- Verify analytics are loaded
- Test in incognito mode

## 📈 Conversion Goals

**Pre-configured Events:**
- `waitlist_signup` - Email form submission
- `cookie_consent` - Banner interaction
- Custom events via `trackEvent()`

**Recommended Goals:**
- Set up waitlist signup as conversion
- Track scroll depth
- Monitor button clicks
- Measure time on page

## 📄 Compliance

**GDPR Ready:**
- Cookie consent for GA4
- Privacy policy links
- Clear opt-out options
- Anonymized data collection

**CCPA Compatible:**
- User choice respected
- Data minimization
- Transparent collection

This setup ensures you're compliant with major privacy regulations while getting valuable insights! 🎯
