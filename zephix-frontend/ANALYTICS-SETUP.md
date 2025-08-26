# Analytics Setup for Zephix Landing Page

## Overview
Complete setup guide for Google Analytics 4 (GA4) and Vercel Analytics integration.

## Google Analytics 4 Setup

### 1. Create GA4 Property

1. **Go to Google Analytics**
   - Visit [analytics.google.com](https://analytics.google.com)
   - Sign in with your Google account

2. **Create Property**
   - Click "Start measuring"
   - Enter property name: "Zephix"
   - Select reporting time zone
   - Choose currency
   - Click "Next"

3. **Business Information**
   - Select business size
   - Choose business category
   - Select business objectives
   - Click "Create"

### 2. Configure Data Streams

1. **Web Stream**
   - Click "Web" under "Choose a platform"
   - Enter website URL: `https://zephix.ai`
   - Enter stream name: "Zephix Landing Page"
   - Click "Create stream"

2. **Get Measurement ID**
   - Copy the Measurement ID (format: G-XXXXXXXXXX)
   - This will be your `VITE_GA_ID`

### 3. Enhanced Measurement

Enable these features:
- [x] Page views
- [x] Scrolls
- [x] Outbound clicks
- [x] Site search
- [x] Video engagement
- [x] File downloads

### 4. Custom Events

Create these custom events in GA4:

#### Landing Page View
- Event name: `landing_view`
- Parameters:
  - `page_title` (text)
  - `page_location` (text)
  - `user_agent` (text)
  - `referrer` (text)

#### CTA Click
- Event name: `cta_click`
- Parameters:
  - `cta_type` (text)
  - `cta_location` (text)
  - `button_text` (text)

#### Form Interaction
- Event name: `form_interaction`
- Parameters:
  - `form_type` (text)
  - `step` (text)
  - `field_name` (text)

#### Form Submission
- Event name: `form_submit`
- Parameters:
  - `form_type` (text)
  - `company_size` (text)
  - `current_tool` (text)
  - `status` (text)

#### FAQ Expand
- Event name: `faq_expand`
- Parameters:
  - `question_id` (text)
  - `question_text` (text)

#### Scroll Depth
- Event name: `scroll_depth`
- Parameters:
  - `depth_percentage` (number)
  - `page_section` (text)

## Vercel Analytics Setup

### 1. Install Package
```bash
npm install @vercel/analytics
```

### 2. Initialize in Main App
```typescript
// src/main.tsx or src/App.tsx
import { Analytics } from '@vercel/analytics/react';

function App() {
  return (
    <>
      {/* Your app content */}
      <Analytics />
    </>
  );
}
```

### 3. Environment Variables
```env
# .env.local
VITE_VERCEL_ANALYTICS_ENABLED=true
```

## Implementation in Landing Page

### 1. Update Analytics Service
```typescript
// src/lib/analytics.ts
export const initializeAnalytics = () => {
  // Google Analytics
  if (typeof window !== 'undefined' && window.gtag) {
    // GA4 is already initialized
    console.log('GA4 initialized');
  }
  
  // Vercel Analytics
  if (typeof window !== 'undefined' && window.va) {
    console.log('Vercel Analytics initialized');
  }
};

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  // Google Analytics 4
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, properties);
  }
  
  // Vercel Analytics
  if (typeof window !== 'undefined' && window.va) {
    window.va('track', eventName, properties);
  }
  
  // Console logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 Analytics Event: ${eventName}`, properties);
  }
};
```

### 2. Add GA4 Script to HTML
```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-XXXXXXXXXX', {
        page_title: 'Zephix Landing Page',
        page_location: window.location.href,
        custom_map: {
          'custom_parameter_1': 'page_title',
          'custom_parameter_2': 'page_location'
        }
      });
    </script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

### 3. Enhanced Event Tracking
```typescript
// Enhanced tracking functions
export const trackLandingView = (properties?: Record<string, any>) => {
  trackEvent('landing_view', {
    page_title: document.title,
    page_location: window.location.href,
    user_agent: navigator.userAgent,
    referrer: document.referrer,
    timestamp: new Date().toISOString(),
    ...properties
  });
};

export const trackCTAClick = (ctaType: string, location: string, buttonText?: string) => {
  trackEvent('cta_click', {
    cta_type: ctaType,
    cta_location: location,
    button_text: buttonText || 'Unknown',
    timestamp: new Date().toISOString()
  });
};

export const trackFormInteraction = (formType: string, step: string, fieldName?: string) => {
  trackEvent('form_interaction', {
    form_type: formType,
    step: step,
    field_name: fieldName,
    timestamp: new Date().toISOString()
  });
};

export const trackFormSubmit = (formData: any, status: 'success' | 'error', errorMessage?: string) => {
  trackEvent('form_submit', {
    form_type: 'waitlist',
    company_size: formData.teamSize,
    current_tool: formData.currentTool,
    status: status,
    error_message: errorMessage,
    timestamp: new Date().toISOString()
  });
};

export const trackScrollDepth = (depth: number, section?: string) => {
  trackEvent('scroll_depth', {
    depth_percentage: depth,
    page_section: section || 'main',
    timestamp: new Date().toISOString()
  });
};
```

## Conversion Tracking

### 1. Goal Setup in GA4
Create these conversion events:

1. **Waitlist Signup**
   - Event name: `form_submit`
   - Mark as conversion when `status = 'success'`

2. **CTA Click**
   - Event name: `cta_click`
   - Mark as conversion for all CTA clicks

3. **Page Engagement**
   - Event name: `scroll_depth`
   - Mark as conversion when `depth_percentage >= 75`

### 2. Enhanced Ecommerce (Future)
```typescript
// For when you add pricing/checkout
export const trackPurchase = (amount: number, currency: string = 'USD') => {
  gtag('event', 'purchase', {
    transaction_id: generateTransactionId(),
    value: amount,
    currency: currency,
    items: [{
      item_id: 'zephix_subscription',
      item_name: 'Zephix Pro Plan',
      price: amount,
      quantity: 1
    }]
  });
};
```

## Testing & Verification

### 1. GA4 Debug Mode
```typescript
// Enable debug mode in development
if (process.env.NODE_ENV === 'development') {
  gtag('config', 'G-XXXXXXXXXX', {
    debug_mode: true
  });
}
```

### 2. Test Events
```bash
# Test in browser console
gtag('event', 'test_event', {
  test_parameter: 'test_value'
});

# Check GA4 Real-time reports
# Events should appear within 24-48 hours
```

### 3. Chrome DevTools
1. Open DevTools
2. Go to Network tab
3. Filter by "google-analytics"
4. Submit form and verify requests

## Performance Monitoring

### 1. Core Web Vitals
```typescript
// Track Core Web Vitals
export const trackWebVitals = (metric: any) => {
  trackEvent('web_vitals', {
    metric_name: metric.name,
    metric_value: metric.value,
    metric_id: metric.id,
    timestamp: new Date().toISOString()
  });
};

// Initialize in main app
if (typeof window !== 'undefined') {
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(trackWebVitals);
    getFID(trackWebVitals);
    getFCP(trackWebVitals);
    getLCP(trackWebVitals);
    getTTFB(trackWebVitals);
  });
}
```

### 2. User Experience Metrics
```typescript
// Track user engagement
export const trackUserEngagement = () => {
  let engagementStart = Date.now();
  
  // Track time on page
  window.addEventListener('beforeunload', () => {
    const timeOnPage = Date.now() - engagementStart;
    trackEvent('user_engagement', {
      time_on_page: timeOnPage,
      page_url: window.location.href
    });
  });
  
  // Track scroll depth
  let maxScrollDepth = 0;
  window.addEventListener('scroll', () => {
    const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
    if (scrollPercent > maxScrollDepth) {
      maxScrollDepth = scrollPercent;
      if (maxScrollDepth % 25 === 0) { // Track at 25%, 50%, 75%, 100%
        trackScrollDepth(maxScrollDepth);
      }
    }
  });
};
```

## Privacy & Compliance

### 1. GDPR Compliance
```typescript
// Cookie consent management
export const initializeConsent = () => {
  const consent = localStorage.getItem('analytics_consent');
  
  if (consent === 'granted') {
    initializeAnalytics();
  } else if (consent === 'denied') {
    // Disable analytics
    window.gtag = () => {};
    window.va = () => {};
  }
};

// Consent banner component
export const ConsentBanner = () => {
  const handleConsent = (granted: boolean) => {
    localStorage.setItem('analytics_consent', granted ? 'granted' : 'denied');
    if (granted) {
      initializeAnalytics();
    }
    // Hide banner
  };
  
  return (
    <div className="consent-banner">
      <p>We use cookies to analyze site traffic and optimize your experience.</p>
      <button onClick={() => handleConsent(true)}>Accept</button>
      <button onClick={() => handleConsent(false)}>Decline</button>
    </div>
  );
};
```

### 2. Data Retention
- GA4 data retention: 14 months (default)
- Vercel Analytics: 30 days
- Consider implementing data deletion requests

## Reporting & Insights

### 1. GA4 Dashboard
Create custom dashboard with:
- Landing page performance
- Form conversion rates
- CTA click-through rates
- User engagement metrics
- Traffic sources

### 2. Automated Reports
```typescript
// Weekly performance summary
export const generateWeeklyReport = async () => {
  const report = {
    period: 'weekly',
    total_views: 0,
    total_conversions: 0,
    conversion_rate: 0,
    top_traffic_sources: [],
    top_performing_ctas: []
  };
  
  // Send to Slack/email
  await sendReport(report);
};
```

## Troubleshooting

### Common Issues
1. **Events not appearing**: Check GA4 property settings
2. **Wrong data**: Verify measurement ID
3. **Performance impact**: Use lazy loading for analytics
4. **Ad blockers**: Test with disabled ad blockers

### Debug Commands
```typescript
// Check if GA4 is loaded
console.log('GA4 loaded:', typeof window.gtag !== 'undefined');

// Check if Vercel Analytics is loaded
console.log('VA loaded:', typeof window.va !== 'undefined');

// Test event firing
gtag('event', 'test', { test: true });
```

## Deployment Checklist

- [ ] GA4 property created and configured
- [ ] Measurement ID added to environment variables
- [ ] GA4 script added to HTML
- [ ] Vercel Analytics package installed
- [ ] Custom events configured in GA4
- [ ] Conversion goals set up
- [ ] Privacy compliance implemented
- [ ] Testing completed in staging
- [ ] Real-time reports verified
- [ ] Performance monitoring enabled


