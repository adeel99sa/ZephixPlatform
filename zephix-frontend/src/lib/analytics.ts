/**
 * Analytics service for tracking user interactions on the landing page
 * Implements Google Analytics 4 and Vercel Analytics tracking
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    va?: (...args: any[]) => void;
  }
}

export interface AnalyticsEvent {
  eventName: string;
  properties?: Record<string, any>;
  timestamp?: string;
  userId?: string;
  sessionId?: string;
}

export interface ScrollDepthEvent {
  depth: number;
  timestamp: string;
  url: string;
}

export interface FormEvent {
  formType: 'early_access' | 'demo_request' | 'contact';
  step: 'start' | 'submit' | 'success' | 'error';
  fields?: string[];
  errorType?: string;
}

/**
 * Track custom events across multiple analytics platforms
 */
export const trackEvent = (eventName: string, properties?: Record<string, any>): void => {
  try {
    const eventData = {
      ...properties,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      referrer: document.referrer
    };

    // Google Analytics 4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, eventData);
    }

    // Vercel Analytics
    if (typeof window !== 'undefined' && window.va) {
      window.va('track', eventName, eventData);
    }

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', eventName, eventData);
    }

    // Store in localStorage for offline tracking
    storeOfflineEvent(eventName, eventData);
  } catch (error) {
    console.error('Analytics tracking failed:', error);
  }
};

/**
 * Track landing page view
 */
export const trackLandingView = (): void => {
  trackEvent('landing_view', {
    page: 'landing',
    referrer: document.referrer,
    utm_source: getUrlParameter('utm_source'),
    utm_medium: getUrlParameter('utm_medium'),
    utm_campaign: getUrlParameter('utm_campaign')
  });
};

/**
 * Track CTA button clicks
 */
export const trackCTAClick = (ctaType: string, location: string): void => {
  trackEvent('cta_click', {
    cta_type: ctaType,
    location,
    button_text: ctaType === 'early_access' ? 'Request Early Access' : ctaType
  });
};

/**
 * Track form interactions
 */
export const trackFormInteraction = (event: FormEvent): void => {
  trackEvent('form_interaction', event);
};

/**
 * Track form start when user focuses email field
 */
export const trackFormStart = (formType: string): void => {
  trackEvent('form_start', {
    form_type: formType,
    timestamp: new Date().toISOString()
  });
};

/**
 * Track form submission
 */
export const trackFormSubmit = (formType: string, success: boolean, errorType?: string): void => {
  trackEvent('form_submit', {
    form_type: formType,
    success,
    error_type: errorType,
    timestamp: new Date().toISOString()
  });
};

/**
 * Track FAQ interactions
 */
export const trackFAQExpand = (questionId: string, question: string): void => {
  trackEvent('faq_expand', {
    question_id: questionId,
    question,
    timestamp: new Date().toISOString()
  });
};

/**
 * Track scroll depth
 */
export const trackScrollDepth = (depth: number): void => {
  trackEvent('scroll_depth', {
    depth,
    timestamp: new Date().toISOString(),
    url: window.location.href
  });
};

/**
 * Track section visibility
 */
export const trackSectionView = (sectionName: string): void => {
  trackEvent('section_view', {
    section: sectionName,
    timestamp: new Date().toISOString(),
    url: window.location.href
  });
};

/**
 * Track video interactions
 */
export const trackVideoInteraction = (action: 'play' | 'pause' | 'complete', videoId: string): void => {
  trackEvent('video_interaction', {
    action,
    video_id: videoId,
    timestamp: new Date().toISOString()
  });
};

/**
 * Track external link clicks
 */
export const trackExternalLink = (url: string, linkText: string): void => {
  trackEvent('external_link_click', {
    url,
    link_text: linkText,
    timestamp: new Date().toISOString()
  });
};

/**
 * Get URL parameter value
 */
const getUrlParameter = (name: string): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
};

/**
 * Store events offline for later sync
 */
const storeOfflineEvent = (eventName: string, properties: Record<string, any>): void => {
  try {
    const offlineEvents = JSON.parse(localStorage.getItem('zephix_offline_events') || '[]');
    offlineEvents.push({
      eventName,
      properties,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 events
    if (offlineEvents.length > 100) {
      offlineEvents.splice(0, offlineEvents.length - 100);
    }
    
    localStorage.setItem('zephix_offline_events', JSON.stringify(offlineEvents));
  } catch (error) {
    console.error('Failed to store offline event:', error);
  }
};

/**
 * Sync offline events when connection is restored
 */
export const syncOfflineEvents = async (): Promise<void> => {
  try {
    const offlineEvents = JSON.parse(localStorage.getItem('zephix_offline_events') || '[]');
    
    if (offlineEvents.length === 0) return;

    // Send all offline events
    for (const event of offlineEvents) {
      trackEvent(event.eventName, event.properties);
    }

    // Clear offline events
    localStorage.removeItem('zephix_offline_events');
  } catch (error) {
    console.error('Failed to sync offline events:', error);
  }
};

/**
 * Initialize analytics
 */
export const initializeAnalytics = (): void => {
  // Track landing page view
  trackLandingView();

  // Listen for online/offline events
  window.addEventListener('online', syncOfflineEvents);
  
  // Track page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      trackEvent('page_visible');
    } else {
      trackEvent('page_hidden');
    }
  });

  // Track beforeunload
  window.addEventListener('beforeunload', () => {
    trackEvent('page_exit');
  });
};

/**
 * Cleanup analytics listeners
 */
export const cleanupAnalytics = (): void => {
  window.removeEventListener('online', syncOfflineEvents);
};
