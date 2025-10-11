type AnalyticsEvent = {
  event: string;
  userId?: string;
  properties?: Record<string, any>;
  timestamp: Date;
};

class Analytics {
  track(event: AnalyticsEvent) {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', event);
    }
    
    // Send to backend endpoint
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    }).catch(err => console.error('Analytics error:', err));
  }
}

export const analytics = new Analytics();





