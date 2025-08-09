# Zephix Landing Site

[![Landing Site CI](https://github.com/adeel99sa/ZephixPlatform/actions/workflows/landing-ci.yml/badge.svg)](https://github.com/adeel99sa/ZephixPlatform/actions/workflows/landing-ci.yml)

A modern, responsive landing page for Zephix AI-powered project management platform with email waitlist signup.

## 🚀 Quick Start

1. Replace `YOUR_FORM_ID` in `index.html` with your actual ConvertKit form ID
2. Deploy to Netlify or Vercel (configs included)
3. Point your domain to the hosting service

## 📧 Email Provider Setup

### ConvertKit (Default)
1. Create a form in ConvertKit
2. Get your form ID from the embed code
3. Replace `YOUR_FORM_ID` in two places in `index.html`:
   - `action="https://app.convertkit.com/forms/YOUR_FORM_ID/subscriptions"`
   - `data-sv-form="YOUR_FORM_ID"`

### Mailchimp (Alternative)
1. Copy the form code from `mailchimp-form-example.html`
2. Replace the ConvertKit form section in `index.html`
3. Update the Mailchimp URLs with your account details:
   - `YOUR_MAILCHIMP_DOMAIN` (e.g., yourcompany.us1.list-manage.com)
   - `YOUR_USER_ID` and `YOUR_LIST_ID`
   - Hidden field name `b_YOUR_USER_ID_YOUR_LIST_ID`

## 🎨 Form Features

- **Email validation** with real-time feedback
- **Role selection** dropdown for better segmentation  
- **Double opt-in notice** for compliance
- **Loading states** with animated spinner
- **Success message** after submission
- **No local storage** - all data goes directly to provider
- **GDPR compliant** with privacy links
- **Analytics ready** - includes Google Analytics and Facebook Pixel hooks

## 🛠 Deployment

### Netlify
- Auto-deploys with `netlify.toml` configuration
- Includes security headers and redirects
- WWW to apex domain redirect included

### Vercel  
- Auto-deploys with `vercel.json` configuration
- Clean URLs and security headers
- Redirect handling included

## 📁 File Structure

```
zephix-landing/
├── index.html                    # Main landing page
├── styles.css                    # CSS styling
├── 404.html                      # Custom error page
├── privacy.html                  # Privacy policy
├── terms.html                    # Terms of service
├── robots.txt                    # SEO robots file
├── netlify.toml                  # Netlify config
├── vercel.json                   # Vercel config
├── _redirects                    # Netlify redirects
├── mailchimp-form-example.html   # Mailchimp form alternative
└── README.md                     # This file
```

## 🔧 Customization

### Colors & Branding
Update CSS custom properties in `styles.css`:
```css
:root {
    --primary-color: #3b82f6;
    --secondary-color: #8b5cf6;
    --accent-color: #06b6d4;
    /* ... */
}
```

### Form Fields
To add more fields, update both the HTML form and the JavaScript validation:
1. Add input/select elements with appropriate `name` attributes
2. Update the form validation in the JavaScript
3. Ensure your email provider supports the field names

### Analytics
Replace placeholder values in the JavaScript:
- Google Analytics: `AW-CONVERSION_ID/CONVERSION_LABEL`
- Facebook Pixel: Already set up for `Lead` event

## 🔒 Security Features

- Content Security Policy (CSP)
- HTTPS enforcement
- XSS protection headers
- Frame protection
- HSTS headers
- Input validation

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints at 768px and 480px
- Touch-friendly interactive elements
- Optimized typography scaling

## 🎯 SEO Optimized

- Semantic HTML structure
- Open Graph and Twitter meta tags
- Structured data ready
- Fast loading with optimized assets
- robots.txt for search engine crawling

## 📊 Performance

- Minimal dependencies
- Optimized images and assets
- CDN-ready deployment
- Progressive enhancement
- Fast Time to Interactive (TTI)

## 🧪 Testing

Test the form locally:
1. Open `index.html` in a browser
2. Fill out the form (won't submit without real form ID)
3. Check console for any JavaScript errors
4. Verify responsive design on different screen sizes

## 📞 Support

For issues or questions about this landing page template, check:
1. Provider documentation (ConvertKit/Mailchimp)
2. Hosting platform docs (Netlify/Vercel)
3. Browser developer tools for debugging

## 📄 License

This template is provided as-is for the Zephix project.
